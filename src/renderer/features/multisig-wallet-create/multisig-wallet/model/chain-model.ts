import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type Asset, type Chain, type Transaction } from '@/shared/core';
import { series } from '@/shared/effector/series';
import { TEST_ACCOUNTS, getNativeAsset, merge, nonNullable, nullable, withdrawableAmountBN } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';

import { flowModel } from './flow-model';
import { formModel } from './form-model';

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
    multisigChains: flowModel.$multisigChains,
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

const $chainsWithFeeAvailableForInitiatorChain = combine(
  { chains: $chainsWithFee, initiator: flowModel.$initiator },
  ({ chains, initiator }) => {
    if (!initiator) return [];

    return chains.filter(chain => accountService.isAccountAvailableOnChain(initiator, chain.chain));
  },
);

const filteredChains = $chainsWithFeeAvailableForInitiatorChain.map(chains => chains.map(chain => chain.chain));

sample({
  clock: [$chainsWithFeeAvailableForInitiatorChain, flowModel.$signer],
  source: {
    signatories: flowModel.$allChainsSignatories,
    initiators: flowModel.$initiators,
    balances: balanceModel.$balanceMap,
    chains: $chainsWithFeeAvailableForInitiatorChain,
  },
  filter: ({ chains, initiators }) => chains.length > 0 && nonNullable(initiators),
  fn: ({ signatories, balances, chains, initiators }) => {
    const availableChains = [];
    const unavailableChains = [];

    for (const { chain, fee } of chains) {
      const asset = getNativeAsset(chain.assets);
      const initiator =
        initiators && initiators.find(initiator => accountService.isAccountAvailableOnChain(initiator, chain));

      const signatory = signatories[chain.chainId].at(0);

      if (!signatory || !initiator) {
        unavailableChains.push({ chain, fee: fee ?? '0', asset, balance: '0' });
        continue;
      }

      const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId);
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

sample({
  clock: $availableChains,
  source: formModel.form.fields.chainId.$value,
  filter: (currentChainId, availableChains) => {
    // Only auto-select if:
    // 1. No chain is currently selected, OR
    // 2. Current chain is not in available chains

    if (!currentChainId) return availableChains.length > 0;

    return availableChains.length > 0 && !availableChains.some(chain => chain.chain.chainId === currentChainId);
  },
  fn: (_, availableChains) => availableChains.at(0)!.chain.chainId,
  target: formModel.form.fields.chainId.change,
});

export const chainSelectorModel = {
  $availableChains,
  $unavailableChains,
  $isLoading: calculateFeesSeriesFx.pending,
  $multisigChains: filteredChains,
};
