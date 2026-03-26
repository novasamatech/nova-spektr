import { type ApiPromise } from '@polkadot/api';
import { combine, createStore, sample } from 'effector';
import { keyBy, uniqBy } from 'lodash';
import { debounce } from 'patronum';

import { type Chain, type ChainId } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { deepLinkService } from '@/domains/app';
import { accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { multisigService } from '@/features/multisig-wallet';

import { deepLinkModel } from './deep-link';
import { $notificationsReady } from './notifications';

const $trigger = createStore<string>('');
const $debouncedApis = createStore<Record<ChainId, ApiPromise>>({});

sample({
  clock: debounce(networkModel.$apis, 2000),
  source: networkModel.$chains,
  fn: (chains, apis) => {
    const multisigChains = Object.values(chains)
      .filter(chain => apis[chain.chainId] && networkUtils.isMultisigSupported(chain.options))
      .map(c => c.chainId);

    return multisigChains.join(',');
  },
  target: $trigger,
});

sample({
  clock: $trigger,
  source: networkModel.$apis,
  target: $debouncedApis,
});

const $input = combine(
  {
    apis: $debouncedApis,
    chains: networkModel.$chains,
    connections: networkModel.$connections,
    accounts: accounts.$list,
    notificationsReady: $notificationsReady, // initialize notifications binding
  },
  ({ apis, chains, connections, accounts }) => {
    const multisigs = accounts.filter(accountUtils.isAnyMultisigAccount);
    if (multisigs.length === 0) return null;

    const availableChains: Chain[] = [];

    for (const account of multisigs) {
      if (accountService.isChainAccount(account)) {
        const chain = chains[account.chainId];
        if (chain) availableChains.push(chain);
      } else {
        const chainAccounts = Object.values(chains).filter(chain =>
          accountService.isAccountAvailableOnChain(account, chain),
        );
        availableChains.push(...chainAccounts);
      }
    }

    const uniqueChains = uniqBy(availableChains, 'chainId').filter(chain => {
      const connection = connections[chain.chainId];

      return !connection || networkUtils.isEnabledConnection(connection);
    });
    const availableApis: Record<ChainId, ApiPromise> = {};

    for (const chain of uniqueChains) {
      const api = apis[chain.chainId];
      if (api) {
        availableApis[chain.chainId] = api;
      }
    }

    const availableChainsRecord = keyBy(uniqueChains, c => c.chainId);

    return {
      chains: availableChainsRecord,
      apis: availableApis,
      accountIds: multisigs.map(account => multisigService.getMultisigAccountId(account)),
    };
  },
);

export const multisigOperationsFeature = createFeature({
  name: 'multisig/operations',
  input: $input,
});

deepLinkService.registerHandler(deepLinkModel.multisigOperationDeepLinkHandler);
