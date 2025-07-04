import { type ApiPromise } from '@polkadot/api';
import { combine, createStore, sample } from 'effector';
import { debounce } from 'patronum';

import { type ChainId } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

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
    wallet: walletModel.$activeWallet,
  },
  ({ apis, chains, wallet }) => {
    if (nullable(wallet) || !walletUtils.isMultisig(wallet)) return null;

    const input = [];

    for (const account of wallet.accounts) {
      if (accountUtils.isProxiedAccount(account)) {
        const api = apis[account.chainId];
        const chain = chains[account.chainId];

        if (api && chain) {
          input.push({
            api,
            chain,
            accountId: account.accountId,
          });
        }
      } else {
        const multisigChains = Object.values(chains).filter(chain => networkUtils.isMultisigSupported(chain.options));

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
    }

    return input;
  },
);

export const multisigOperationsFeature = createFeature({
  name: 'multisig/operations',
  input: $input,
});
