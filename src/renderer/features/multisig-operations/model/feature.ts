import { type ApiPromise } from '@polkadot/api';
import { combine, createStore, sample } from 'effector';
import { debounce } from 'patronum';

import { type ChainId } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { nonNullable } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

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
    accounts: walletSelect.$selectedAccounts,
  },
  ({ apis, chains, accounts }) => {
    const multisigAccounts = accounts.filter(accountUtils.isMultisigAccount);
    const proxiedAccounts = accounts.filter(accountUtils.isProxiedAccount);
    if (multisigAccounts.length === 0 && proxiedAccounts.length === 0) return null;

    const multisigChains = Object.values(chains).filter(chain => networkUtils.isMultisigSupported(chain.options));
    const input = [];

    for (const account of proxiedAccounts) {
      const api = apis[account.chainId];
      const chain = chains[account.chainId];

      if (api) {
        input.push({
          api,
          chain,
          accountId: account.accountId,
        });
      }
    }

    for (const account of multisigAccounts) {
      for (const chain of multisigChains) {
        const api = apis[chain.chainId];

        if (api) {
          input.push({
            api,
            chain,
            accountId: account.accountId,
          });
        }
      }
    }

    return input;
  },
);

export const multisigOperationsFeature = createFeature({
  name: 'multisig/operations',
  input: $input,
});

sample({
  clock: walletSelect.$selectedWallet,
  filter: wallet => nonNullable(wallet) && walletUtils.isMultisig(wallet),
  target: multisigOperationsFeature.restore,
});
