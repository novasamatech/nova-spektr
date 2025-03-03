import { type ApiPromise } from '@polkadot/api';
import { combine, createStore, sample } from 'effector';
import { debounce } from 'patronum';

import { type ChainId } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel, networkUtils } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
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
    wallet: walletModel.$activeWallet,
  },
  ({ apis, chains, wallet }) => {
    if (nullable(wallet) || !walletUtils.isMultisig(wallet)) return null;

    const input = [];

    for (const account of wallet.accounts) {
      if (account.chainId) {
        const api = apis[account.chainId];
        const chain = chains[account.chainId];

        if (api) {
          input.push({
            api,
            chain,
            accountId: account.accountId as AccountId,
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
              accountId: account.accountId as AccountId,
            });
          }
        }
      }
    }

    return input;
  },
);

export const multisigOperationsFeatureStatus = createFeature({
  name: 'multisig/operations',
  input: $input,
});

multisigOperationsFeatureStatus.start();

sample({
  clock: walletSelect.$selectedWallet,
  filter: wallet => nonNullable(wallet) && walletUtils.isMultisig(wallet),
  target: multisigOperationsFeatureStatus.restore,
});
