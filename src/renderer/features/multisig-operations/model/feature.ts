import { type ApiPromise } from '@polkadot/api';
import { combine, createStore, sample } from 'effector';
import { debounce } from 'patronum';

import { type ChainId } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
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
    wallet: walletSelect.$selectedWallet,
  },
  ({ apis, chains, wallet }) => {
    if (nullable(wallet) || !walletUtils.isMultisig(wallet)) return null;

    const input = [];

    for (const account of wallet.accounts) {
      let availableChains;
      if (accountUtils.isFlexibleMultisigAccount(account)) {
        const chain = chains[account.chainId];
        availableChains = chain ? [chain] : [];
      } else {
        availableChains = Object.values(chains).filter(chain => networkUtils.isMultisigSupported(chain.options));
      }

      for (const chain of availableChains) {
        const api = apis[chain.chainId];

        if (api && accountService.isCryptoMatch(account, chain)) {
          input.push({
            api,
            chains,
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
