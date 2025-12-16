import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createStore, sample } from 'effector';

import { type Asset, type Chain, type ChainId } from '@/shared/core';
import { series } from '@/shared/effector';
import { TEST_ACCOUNTS, getNativeAsset, nullable, withTimeout, withdrawableAmountBN } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';

import { flowModel } from './flow-model';
import { DEFAULT_EVM_CHAIN, DEFAULT_SUBSTRATE_CHAIN, formModel } from './form-model';

type ChainWithFeeAndBalance = {
  chain: Chain;
  fee: string;
  balance: string;
  asset: Asset;
};

type ChainFeeResult = {
  chain: Chain;
  fee: string | null;
};

// Cache for fee results - since remark tx parameters are always the same
const feeCache = new Map<ChainId, string>();

const calculateChainFeeFx = createEffect(
  async ({ chain, api }: { chain: Chain; api: ApiPromise | null }): Promise<ChainFeeResult> => {
    if (!api) return { chain, fee: null };

    // Check cache first
    const cached = feeCache.get(chain.chainId);
    if (cached) return { chain, fee: cached };

    try {
      // Use fixed remark transaction for fee estimation
      const fakeTx = transactionBuilder.buildRemark({
        chainId: chain.chainId,
        accountId: TEST_ACCOUNTS[0],
        threshold: 2,
        signatories: [TEST_ACCOUNTS[0], TEST_ACCOUNTS[1]],
      });

      const fee = await withTimeout(transactionService.getTransactionFee(fakeTx, api), 5000, null);

      if (nullable(fee)) {
        return { chain, fee: null };
      }

      // Cache the result
      feeCache.set(chain.chainId, fee);

      return { chain, fee };
    } catch {
      return { chain, fee: null };
    }
  },
);

// Calculate fees for all chains in series
const calculateAllFeesFx = series(calculateChainFeeFx, { parallel: true, skipErrors: true });

const $chainsWithFee = createStore<ChainFeeResult[]>([]).reset(flowModel.flow.close);

// Trigger fee calculation only when APIs and chains are available
sample({
  clock: [networkModel.$apis, flowModel.$multisigChains, flowModel.flow.open],
  source: {
    multisigChains: flowModel.$multisigChains,
    apis: networkModel.$apis,
  },
  filter: ({ multisigChains, apis }) => multisigChains.length > 0 && Object.keys(apis).length > 0,
  fn: ({ multisigChains, apis }) => {
    return multisigChains.map(chain => ({
      chain,
      api: apis[chain.chainId] ?? null,
    }));
  },
  target: calculateAllFeesFx,
});

sample({
  clock: calculateAllFeesFx.doneData,
  target: $chainsWithFee,
});

const $filteredChainsWithFee = combine(
  { chains: $chainsWithFee, initiators: flowModel.$initiators },
  ({ chains, initiators }) => {
    if (!initiators) return [];

    return chains.filter(({ chain }) =>
      initiators.some(initiator => accountService.isAccountAvailableOnChain(initiator, chain)),
    );
  },
);

const $chainsData = combine(
  {
    signatories: flowModel.$allChainsSignatories,
    initiators: flowModel.$initiators,
    balances: balanceModel.$balanceMap,
    chains: $filteredChainsWithFee,
    chosenChainFee: flowModel.$fee,
    currentChain: formModel.$chain,
  },
  ({ signatories, balances, chains, initiators, chosenChainFee, currentChain }) => {
    // Apply filter logic
    if (chains.length === 0 || nullable(initiators)) {
      return {
        availableChains: [],
        unavailableChains: [],
      };
    }

    const availableChains: ChainWithFeeAndBalance[] = [];
    const unavailableChains: ChainWithFeeAndBalance[] = [];

    for (const { chain, fee } of chains) {
      let feeToUse = fee;

      if (currentChain && chain.chainId === currentChain.chainId) {
        feeToUse = chosenChainFee?.toString() ?? null;
      }

      const asset = getNativeAsset(chain.assets);
      const initiator =
        initiators && initiators.find(initiator => accountService.isAccountAvailableOnChain(initiator, chain));

      const signatory = signatories[chain.chainId]?.at(0);

      if (nullable(signatory) || nullable(initiator)) {
        unavailableChains.push({ chain, fee: feeToUse ?? '0', asset, balance: '0' });
        continue;
      }

      const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId);
      const withdrawable = withdrawableAmountBN(balance);

      if (nullable(fee)) {
        unavailableChains.push({ chain, fee: feeToUse ?? '0', asset, balance: withdrawable.toString() });
        continue;
      }

      if (withdrawable.lt(new BN(fee))) {
        unavailableChains.push({ chain, fee: feeToUse ?? '0', asset, balance: withdrawable.toString() });
        continue;
      }

      availableChains.push({ chain, fee: feeToUse ?? '0', asset, balance: withdrawable.toString() });
    }

    return {
      availableChains,
      unavailableChains,
    };
  },
);

const $availableChains = createStore<ChainWithFeeAndBalance[]>([]).reset(flowModel.flow.close);
const $unavailableChains = createStore<ChainWithFeeAndBalance[]>([]).reset(flowModel.flow.close);

sample({
  clock: $chainsData,
  fn: ({ availableChains }) => availableChains,
  target: $availableChains,
});

sample({
  clock: $chainsData,
  fn: ({ unavailableChains }) => unavailableChains,
  target: $unavailableChains,
});

sample({
  clock: $availableChains,
  source: formModel.form.fields.chainId.$value,
  filter: (currentChainId: string | null, availableChains: ChainWithFeeAndBalance[]) => {
    if (!currentChainId) return availableChains.length > 0;

    return availableChains.length > 0 && !availableChains.some(chain => chain.chain.chainId === currentChainId);
  },
  fn: (_: string | null, availableChains: ChainWithFeeAndBalance[]) => availableChains.at(0)!.chain.chainId,
  target: formModel.form.fields.chainId.change,
});

sample({
  clock: $availableChains,
  source: { initiators: flowModel.$initiators, chain: formModel.$chain },
  filter: ({ initiators, chain }, availableChains) => {
    if (availableChains.length !== 0 || nullable(initiators) || nullable(chain)) return false;

    const hasEthereumBased = initiators.some(initiator => accountUtils.isEthereumBased(initiator));
    const hasNonEthereumBased = initiators.some(initiator => !accountUtils.isEthereumBased(initiator));

    return (
      (hasEthereumBased && chain.chainId !== DEFAULT_EVM_CHAIN) ||
      (hasNonEthereumBased && chain.chainId !== DEFAULT_SUBSTRATE_CHAIN)
    );
  },
  fn: ({ initiators }) => {
    const hasEthereumBased = initiators!.some(initiator => accountUtils.isEthereumBased(initiator));
    return hasEthereumBased ? DEFAULT_EVM_CHAIN : DEFAULT_SUBSTRATE_CHAIN;
  },
  target: formModel.form.fields.chainId.change,
});

export const chainSelectorModel = {
  $availableChains,
  $unavailableChains,
  $isLoading: calculateAllFeesFx.pending,
  $filteredChains: $filteredChainsWithFee.map(chains => chains.map(({ chain }) => chain)),
};
