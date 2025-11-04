import { type ApiPromise } from '@polkadot/api';
import { combine, createStore, sample } from 'effector';
import { keyBy } from 'lodash';
import { debounce } from 'patronum';

import { type ChainId } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { deepLinkService } from '@/shared/lib/deep-link';
import { nullable } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { multisigService } from '@/features/multisig-wallet';
import { multisigOperationDeepLinkHandler } from '../deep-link/multisig-operation-deep-link';

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
    wallet: walletSelect.$selectedWallet,
  },
  ({ apis, chains, wallet }) => {
    if (nullable(wallet) || !walletUtils.isMultisig(wallet)) return null;

    const account = wallet.accounts.find(accountUtils.isAnyMultisigAccount);
    if (nullable(account)) return null;

    let availableChains;
    if (accountService.isChainAccount(account)) {
      const chain = chains[account.chainId];
      availableChains = chain ? [chain] : [];
    } else {
      availableChains = Object.values(chains).filter(chain => accountService.isAccountAvailableOnChain(account, chain));
    }

    const availableApis: Record<ChainId, ApiPromise> = {};

    for (const chain of availableChains) {
      const api = apis[chain.chainId];
      if (api) {
        availableApis[chain.chainId] = api;
      }
    }

    const availableChainsRecord = keyBy(availableChains, c => c.chainId);

    return {
      chains: availableChainsRecord,
      apis: availableApis,
      accountId: multisigService.getMultisigAccountId(account),
    };
  },
);

export const multisigOperationsFeature = createFeature({
  name: 'multisig/operations',
  input: $input,
});

deepLinkService.registerHandler(multisigOperationDeepLinkHandler);
