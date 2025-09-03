import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type Asset, type Chain, type Transaction } from '@/shared/core';
import { series } from '@/shared/effector/series';
import { TEST_ACCOUNTS, getNativeAsset, merge, nonNullable, nullable, withdrawableAmountBN } from '@/shared/lib/utils';
import { sortChains } from '@/shared/lib/utils/chains';
import { accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';

import { flowModel } from './flow-model';

type ChainWithFeeAndBalance = {
  chain: Chain;
  fee: string;
  balance: string;
  asset: Asset;
};

type ChainsWithFee = {
  chain: Chain;
  fee: string | null;
};

const $multisigChains = combine(networkModel.$chains, chains => {
  const filteredChains = Object.values(chains).filter(chain => networkUtils.isMultisigSupported(chain.options));
  return sortChains(filteredChains);
});

const calculateFeeForChainFx = createEffect(
  async ({ chain, tx, api }: { chain: Chain; tx: Transaction; api: ApiPromise | null }) => {
    if (!api) return { chain, fee: null };

    try {
      const fee = await transactionService.getTransactionFee(tx, api);
      return { chain, fee };
    } catch {
      return { chain, fee: null };
    }
  },
);

const calculateFeesSeriesFx = series(calculateFeeForChainFx, { parallel: true });

sample({
  clock: [flowModel.$tx, flowModel.$initiator],
  source: {
    multisigChains: $multisigChains,
    apis: networkModel.$apis,
    tx: flowModel.$tx,
  },
  fn: ({ multisigChains, apis, tx }) => {
    return multisigChains.map(chain => {
      const fakeTx = transactionBuilder.buildRemark({
        chainId: chain.chainId,
        accountId: TEST_ACCOUNTS[0],
        threshold: 2,
        signatories: [TEST_ACCOUNTS[0], TEST_ACCOUNTS[1]],
      });

      const transaction = tx ? { ...tx, chainId: chain.chainId, accountId: TEST_ACCOUNTS[0] } : fakeTx;
      return { chain, tx: transaction, api: apis[chain.chainId] ?? null };
    });
  },
  target: calculateFeesSeriesFx,
});

const $availableChains = createStore<ChainWithFeeAndBalance[]>([]).reset(flowModel.flow.close);
const $unavailableChains = createStore<ChainWithFeeAndBalance[]>([]).reset(flowModel.flow.close);
const $chainsWithFee = createStore<ChainsWithFee[]>([]).reset(flowModel.flow.close);

sample({
  clock: calculateFeesSeriesFx.doneData,
  source: $chainsWithFee,
  fn: (chains, newChains) => {
    return merge({
      a: chains,
      b: newChains,
      mergeBy: e => e.chain.chainId,
    });
  },
  target: $chainsWithFee,
});

sample({
  clock: [$chainsWithFee, flowModel.$signer],
  source: {
    signer: flowModel.$signer,
    initiators: flowModel.$initiators,
    balances: balanceModel.$balanceMap,
    chains: $chainsWithFee,
  },
  filter: ({ chains, initiators }) => chains.length > 0 && nonNullable(initiators),
  fn: ({ signer, balances, chains, initiators }) => {
    const availableChains = [];
    const unavailableChains = [];

    for (const { chain, fee } of chains) {
      const asset = getNativeAsset(chain.assets);
      const initiator =
        initiators && initiators.find(initiator => accountService.isAccountAvailableOnChain(initiator, chain));

      if (!signer || !initiator) {
        unavailableChains.push({ chain, fee: fee ?? '0', asset, balance: '0' });
        continue;
      }

      const balance = balanceUtils.getBalance(balances, signer.accountId, chain.chainId, asset.assetId);
      const withdrawable = withdrawableAmountBN(balance);

      if (nullable(fee)) {
        unavailableChains.push({ chain, fee: '0', asset, balance: withdrawable.toString() });
        continue;
      }

      if (withdrawable.lt(new BN(fee))) {
        unavailableChains.push({ chain, fee, asset, balance: withdrawable.toString() });
        continue;
      }

      availableChains.push({ chain, fee, asset, balance: withdrawable.toString() });
    }

    return {
      availableChains,
      unavailableChains,
    };
  },
  target: spread({
    availableChains: $availableChains,
    unavailableChains: $unavailableChains,
  }),
});

export const chainSelectorModel = {
  $availableChains,
  $unavailableChains,
  $isLoading: calculateFeesSeriesFx.pending,
  $multisigChains,
};
