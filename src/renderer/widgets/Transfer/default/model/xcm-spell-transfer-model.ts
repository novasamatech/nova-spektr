import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { spellXcmService } from '@/shared/api/xcm/service/spellXcmService';
import { type Asset, type Chain, type ChainId, TransactionType } from '@/shared/core';
import { takeLast } from '@/shared/effector';
import { toLocalChainId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';

const xcmStarted = createEvent<{ chain: Chain; asset: Asset }>();
const xcmStopped = createEvent();
const xcmChainSelected = createEvent<ChainId>();
const amountChanged = createEvent<string>();
const destinationChanged = createEvent<AccountId | null>();
const rawAmountChanged = createEvent<string>();
const initiatorAccountIdChanged = createEvent<AccountId | null>();

const amountChangedDebounced = debounce({
  source: amountChanged,
  timeout: 500,
});

const destinationChangedDebounced = debounce({
  source: destinationChanged,
  timeout: 300,
});

const $networkStore = restore(xcmStarted, null);
const $xcmChainId = restore(xcmChainSelected, null);
const $originFee = createStore<BN | null>(null);
const $destinationFee = createStore<BN | null>(null);
const $amount = restore(amountChanged, null);
const $destination = restore(destinationChanged, null);
const $rawAmount = restore(rawAmountChanged, null);
const $initiatorAccountId = restore(initiatorAccountIdChanged, null);

const $xcmChain = combine(
  {
    chains: networkModel.$chains,
    xcmChainId: $xcmChainId,
  },
  ({ chains, xcmChainId }) => {
    if (!xcmChainId) return null;
    return chains[xcmChainId] ?? null;
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? (apis[network.chain.chainId] ?? null) : null;
  },
);

const $apiDestination = combine(
  {
    apis: networkModel.$apis,
    xcmChain: $xcmChain,
  },
  ({ apis, xcmChain }) => {
    if (!xcmChain) return undefined;
    return apis[xcmChain.chainId] ?? undefined;
  },
  { skipVoid: false },
);

type FeeCalculationParams = {
  api: ApiPromise;
  network: { chain: Chain; asset: Asset };
  xcmChain: Chain;
  destination: AccountId;
  rawAmount: string;
  initiatorAccountId: AccountId | null;
};

const getXcmFeesFx = takeLast({
  fn: async (params: FeeCalculationParams, abortSignal: AbortSignal) => {
    const { api, network, xcmChain, destination, rawAmount, initiatorAccountId } = params;

    const originChainId = api.genesisHash.toHex();
    if (originChainId === xcmChain.chainId) {
      return null;
    }

    const fromChainName = spellXcmService.getSpellChainName(network.chain);
    const toChainName = spellXcmService.getSpellChainName(xcmChain);

    if (!fromChainName || !toChainName) {
      return null;
    }

    const destinationAddress = spellXcmService.prepareAddressForChain(destination, xcmChain, toChainName);

    let senderAddress: string | undefined;
    if (initiatorAccountId) {
      senderAddress = spellXcmService.prepareAddressForChain(initiatorAccountId, network.chain, fromChainName);
    }

    return spellXcmService.getXcmFees(
      {
        fromChain: network.chain,
        toChain: xcmChain,
        asset: network.asset,
        amount: rawAmount,
        destinationAddress,
        senderAddress,
      },
      abortSignal,
    );
  },
  key: () => 'xcmFeeCalculation',
});

const $feeCalculationParams = combine(
  {
    api: $api,
    network: $networkStore,
    xcmChain: $xcmChain,
    destination: $destination,
    rawAmount: $rawAmount,
    initiatorAccountId: $initiatorAccountId,
  },
  ({ api, network, xcmChain, destination, rawAmount, initiatorAccountId }) => {
    if (!api || !network || !xcmChain || !destination || !rawAmount) {
      return null;
    }

    return {
      api,
      network,
      xcmChain,
      destination,
      rawAmount,
      initiatorAccountId,
    };
  },
);

sample({
  clock: [amountChangedDebounced, destinationChangedDebounced, xcmChainSelected],
  source: $feeCalculationParams,
  filter: (params): params is FeeCalculationParams => params !== null,
  target: getXcmFeesFx,
});

const isAbortError = (err: unknown) => err && typeof err === 'object' && 'name' in err && err.name === 'AbortError';

sample({
  clock: getXcmFeesFx.doneData,
  fn: (fees) => fees?.destinationFee ?? null,
  target: $destinationFee,
});

sample({
  clock: getXcmFeesFx.doneData,
  fn: (fees) => fees?.originFee ?? null,
  target: $originFee,
});

sample({
  clock: getXcmFeesFx.failData,
  filter: (error) => !isAbortError(error),
  fn: () => null,
  target: $destinationFee,
});

sample({
  clock: getXcmFeesFx.failData,
  filter: (error) => !isAbortError(error),
  fn: () => null,
  target: $originFee,
});

sample({
  clock: [xcmChainSelected, amountChangedDebounced, destinationChangedDebounced],
  fn: () => null,
  target: $destinationFee,
});

sample({
  clock: [xcmChainSelected, amountChangedDebounced, destinationChangedDebounced],
  fn: () => null,
  target: $originFee,
});

const $isDestinationFeeLoading = combine(
  {
    isPending: getXcmFeesFx.pending,
    feeParams: $feeCalculationParams,
  },
  ({ isPending, feeParams }) => {
    return isPending && feeParams !== null;
  },
);

const $shouldShowFees = combine(
  {
    isDestinationFeeLoading: $isDestinationFeeLoading,
    originFee: $originFee,
    destinationFee: $destinationFee,
  },
  ({ isDestinationFeeLoading, originFee, destinationFee }) => {
    return isDestinationFeeLoading || originFee !== null || destinationFee !== null;
  },
);

const getAvailableTransfersFx = createEffect(
  async ({ network }: { network: { chain: Chain; asset: Asset } | null }) => {
    if (!network) return [];
    return spellXcmService.getAvailableTransfers(network.chain, network.asset);
  },
);

const $transferDirections = createStore<string[]>([]);

sample({
  clock: xcmStarted,
  source: { network: $networkStore },
  target: getAvailableTransfersFx,
});

sample({
  clock: getAvailableTransfersFx.doneData,
  target: $transferDirections,
});

const $transferDirection = combine(
  {
    xcmChainId: $xcmChainId,
    transferDirections: $transferDirections,
    chains: networkModel.$chains,
    network: $networkStore,
  },
  ({ xcmChainId, transferDirections, chains, network }) => {
    if (!xcmChainId || !transferDirections || !network) return undefined;

    const selectedChain = chains[xcmChainId];
    if (!selectedChain) return undefined;

    const selectedChainName = spellXcmService.getSpellChainName(selectedChain);
    if (!selectedChainName) return undefined;

    const isAvailable = transferDirections.includes(selectedChainName);
    if (!isAvailable) return undefined;

    return {
      destination: {
        chainId: toLocalChainId(selectedChain.chainId),
        assetId: network.asset.assetId,
      },
    };
  },
  { skipVoid: false },
);

type BuildTransferParams = {
  network: { chain: Chain; asset: Asset };
  xcmChain: Chain;
  destination: AccountId;
  amount: string;
  initiatorAccountId: AccountId | null;
};

const buildTransferFx = createEffect(
  async ({ network, xcmChain, destination, amount, initiatorAccountId }: BuildTransferParams) => {
    const fromChainName = spellXcmService.getSpellChainName(network.chain);
    const toChainName = spellXcmService.getSpellChainName(xcmChain);

    if (!fromChainName || !toChainName) {
      return null;
    }

    const destinationAddress = spellXcmService.prepareAddressForChain(destination, xcmChain, toChainName);

    let senderAddress: string | undefined;
    if (initiatorAccountId) {
      senderAddress = spellXcmService.prepareAddressForChain(initiatorAccountId, network.chain, fromChainName);
    }

    const result = await spellXcmService.buildTransfer({
      fromChain: network.chain,
      toChain: xcmChain,
      asset: network.asset,
      amount,
      destinationAddress,
      senderAddress,
    });

    return result.extrinsic;
  },
);

const $spellExtrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null);

const $buildTransferParams = combine(
  {
    network: $networkStore,
    xcmChain: $xcmChain,
    destination: $destination,
    amount: $amount,
    rawAmount: $rawAmount,
    initiatorAccountId: $initiatorAccountId,
  },
  ({ network, xcmChain, destination, amount, rawAmount, initiatorAccountId }) => {
    if (!network || !xcmChain || !destination || !amount) {
      return null;
    }

    return {
      network,
      xcmChain,
      destination,
      amount: rawAmount ?? amount,
      initiatorAccountId,
    };
  },
);

sample({
  clock: [xcmChainSelected, destinationChanged, amountChanged, xcmStarted],
  source: $buildTransferParams,
  filter: (params): params is BuildTransferParams => params !== null,
  target: buildTransferFx,
});

sample({
  clock: buildTransferFx.doneData,
  target: $spellExtrinsic,
});

sample({
  clock: buildTransferFx.fail,
  fn: () => null,
  target: $spellExtrinsic,
});

sample({
  clock: [xcmChainSelected, destinationChanged, amountChanged],
  fn: () => null,
  target: $spellExtrinsic,
});

const $xcmData = combine(
  {
    api: $api,
    xcmChainId: $xcmChainId,
    spellExtrinsic: $spellExtrinsic,
    transferDirection: $transferDirection,
  },
  ({ api, xcmChainId, spellExtrinsic, transferDirection }) => {
    if (!api || !transferDirection || !xcmChainId || !spellExtrinsic) {
      return undefined;
    }

    return {
      transactionType: TransactionType.XTOKENS_TRANSFER_MULTIASSET,
      args: {
        destinationChain: xcmChainId,
        spellExtrinsic,
      },
    };
  },
  { skipVoid: false },
);

export const xcmSpellTransferModel = {
  $apiDestination,
  $xcmData,
  $originFee,
  $destinationFee,
  $transferDirections,
  $transferDirection,
  $xcmChainId,
  $xcmChain,
  $isDestinationFeeLoading,
  $shouldShowFees,

  events: {
    xcmStarted,
    xcmStopped,
    xcmChainSelected,
    amountChanged,
    rawAmountChanged,
    destinationChanged,
    initiatorAccountIdChanged,
  },
};
