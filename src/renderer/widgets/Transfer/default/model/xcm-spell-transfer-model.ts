import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { spellXcmService } from '@/shared/api/xcm/service/spellXcmService';
import { normalizeXcmError } from '@/shared/api/xcm/service/xcm-error-utils';
import { type Asset, type Chain, type ChainId, TransactionType } from '@/shared/core';
import { takeLast } from '@/shared/effector';
import {
  TEST_ACCOUNTS,
  TEST_EVM_ADDRESS,
  isEvmChain,
  toAccountId,
  toLocalChainId,
  validateAddress,
} from '@/shared/lib/utils';
import { toAssetPrecision, toPrecision } from '@/shared/lib/utils/balance';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';

const xcmStarted = createEvent<{ chain: Chain; asset: Asset }>();
const xcmStopped = createEvent();
const xcmChainSelected = createEvent<ChainId>();
const destinationChanged = createEvent<AccountId | null>();
const rawAmountChanged = createEvent<string>();
const initiatorAccountIdChanged = createEvent<AccountId | null>();
const buildTransferDryRunResult = createEvent<{
  success: boolean;
  failureReason?: string;
  failureChain?: string;
} | null>();

const rawAmountChangedDebounced = debounce({
  source: rawAmountChanged,
  timeout: 500,
});

const destinationChangedDebounced = debounce({
  source: destinationChanged,
  timeout: 300,
});

const $networkStore = restore(xcmStarted, null);
const $xcmChainId = restore(xcmChainSelected, null).reset(xcmStarted, xcmStopped);
const $originFee = createStore<BN | null>(null).reset(xcmStarted, xcmStopped);
const $destinationFee = createStore<BN | null>(null).reset(xcmStarted, xcmStopped);
const $destination = restore(destinationChanged, null).reset(xcmStarted, xcmStopped);
const $rawAmount = restore(rawAmountChanged, null).reset(xcmStarted, xcmStopped);
const $initiatorAccountId = restore(initiatorAccountIdChanged, null).reset(xcmStarted, xcmStopped);
const $buildTransferDryRunResult = restore(buildTransferDryRunResult, null).reset(xcmStarted, xcmStopped);

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

type DetectHopChainsParams = {
  api: ApiPromise;
  apiDestination: ApiPromise;
  network: { chain: Chain; asset: Asset };
  xcmChain: Chain;
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
};

const detectHopChainsFx = takeLast({
  fn: async (params: DetectHopChainsParams): Promise<DetectHopChainsResult | null> => {
    const { api, apiDestination, network, xcmChain, chains, apis } = params;

    if (network.chain.chainId === xcmChain.chainId) {
      return null;
    }

    const fromChainName = spellXcmService.getSpellChainName(network.chain);
    const toChainName = spellXcmService.getSpellChainName(xcmChain);

    if (!fromChainName || !toChainName) {
      return null;
    }

    const isDestinationEvm = isEvmChain(xcmChain);
    const isSourceEvm = isEvmChain(network.chain);

    const testDestination = isDestinationEvm ? toAccountId(TEST_EVM_ADDRESS) : TEST_ACCOUNTS[0];
    const testSender = isSourceEvm ? toAccountId(TEST_EVM_ADDRESS) : TEST_ACCOUNTS[0];
    const testDestinationAddress = spellXcmService.prepareAddressForChain(testDestination, xcmChain, toChainName);
    const testSenderAddress = spellXcmService.prepareAddressForChain(testSender, network.chain, fromChainName);

    try {
      const result = await spellXcmService.detectHopChains({
        fromChain: network.chain,
        toChain: xcmChain,
        asset: network.asset,
        testDestinationAddress,
        testSenderAddress,
        fromChainApi: api,
        toChainApi: apiDestination,
        chains,
        apis,
      });

      return result;
    } catch (error) {
      console.error('[TransferPath] detectHopChainsFx error', {
        fromChain: network.chain.name,
        toChain: xcmChain.name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
  key: ({ network, xcmChain }) => `${network.chain.chainId}-${xcmChain.chainId}`,
});

const $detectHopChainsParams = combine(
  {
    api: $api,
    apiDestination: $apiDestination,
    network: $networkStore,
    xcmChain: $xcmChain,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  ({ api, apiDestination, network, xcmChain, chains, apis }) => {
    if (!api || !apiDestination || !network || !xcmChain) {
      return null;
    }

    if (network.chain.chainId === xcmChain.chainId) {
      return null;
    }

    return {
      api,
      apiDestination,
      network,
      xcmChain,
      chains,
      apis,
    };
  },
);

const $hopApiOverrides = createStore<Record<string, ApiPromise>>({}).reset(xcmStarted, xcmStopped);

sample({
  clock: xcmChainSelected,
  source: $detectHopChainsParams,
  filter: (params): params is DetectHopChainsParams => params !== null,
  target: detectHopChainsFx,
});

type DetectHopChainsResult = {
  hopApiOverrides: Record<string, ApiPromise>;
  dryRunResult: {
    destination?: { success: boolean; failureReason?: string; failureSubReason?: string };
    failureChain?: string;
    failureReason?: string;
    failureSubReason?: string;
  };
};

sample({
  clock: detectHopChainsFx.doneData,
  filter: (result): result is DetectHopChainsResult => result !== null,
  fn: (result) => {
    if (!result) return {};
    return result.hopApiOverrides;
  },
  target: $hopApiOverrides,
});

function isPathUnavailableError(error?: string, failureChain?: string): boolean {
  if (!error) return false;
  const isFeesNotMet = error === 'FeesNotMet';
  const isOriginChainFailure = failureChain === 'origin';
  if (isFeesNotMet && isOriginChainFailure) {
    return false;
  }
  const pathUnavailableKeywords = ['TooExpensive', 'Unsupported', 'Unreachable', 'Barrier'];
  return pathUnavailableKeywords.some((keyword) => error.includes(keyword));
}

sample({
  clock: detectHopChainsFx.doneData,
  filter: (result): result is DetectHopChainsResult => result !== null,
  fn: (result) => {
    if (!result) return null;
    const dryRunResult = result.dryRunResult;
    if (!dryRunResult.destination?.success) {
      const error = normalizeXcmError(
        dryRunResult.destination?.failureReason,
        dryRunResult.destination?.failureSubReason,
      );
      const failureChain = dryRunResult.failureChain;
      const isPathError = isPathUnavailableError(error, failureChain);
      if (!isPathError) {
        return null;
      }
      return {
        success: false,
        failureReason: error,
        failureChain,
      };
    }
    return null;
  },
  target: buildTransferDryRunResult,
});

sample({
  clock: detectHopChainsFx.failData,
  fn: (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isPathError = isPathUnavailableError(errorMessage);
    if (!isPathError) {
      return null;
    }
    return {
      success: false,
      failureReason: errorMessage,
      failureChain: undefined,
    };
  },
  target: buildTransferDryRunResult,
});

type FeeCalculationParams = {
  api: ApiPromise;
  apiDestination: ApiPromise;
  network: { chain: Chain; asset: Asset };
  xcmChain: Chain;
  destination: AccountId;
  rawAmount: string;
  initiatorAccountId: AccountId | null;
  hopApiOverrides: Record<string, ApiPromise>;
};

type FakeFeeCalculationParams = {
  api: ApiPromise;
  apiDestination: ApiPromise;
  network: { chain: Chain; asset: Asset };
  xcmChain: Chain;
  hopApiOverrides: Record<string, ApiPromise>;
};

const getXcmFeesWithFakeDataFx = takeLast({
  fn: async (params: FakeFeeCalculationParams, abortSignal: AbortSignal) => {
    const { api, apiDestination, network, xcmChain, hopApiOverrides } = params;

    if (network.chain.chainId === xcmChain.chainId) {
      return null;
    }

    const fromChainName = spellXcmService.getSpellChainName(network.chain);
    const toChainName = spellXcmService.getSpellChainName(xcmChain);

    if (!fromChainName || !toChainName) {
      return null;
    }

    const isDestinationEvm = isEvmChain(xcmChain);
    const isSourceEvm = isEvmChain(network.chain);

    const testDestination = isDestinationEvm ? toAccountId(TEST_EVM_ADDRESS) : TEST_ACCOUNTS[0];
    const testSender = isSourceEvm ? toAccountId(TEST_EVM_ADDRESS) : TEST_ACCOUNTS[0];
    const testDestinationAddress = spellXcmService.prepareAddressForChain(testDestination, xcmChain, toChainName);
    const testSenderAddress = spellXcmService.prepareAddressForChain(testSender, network.chain, fromChainName);

    const testAmount = '1';

    return spellXcmService.getXcmFees(
      {
        fromChain: network.chain,
        toChain: xcmChain,
        asset: network.asset,
        amount: testAmount,
        destinationAddress: testDestinationAddress,
        senderAddress: testSenderAddress,
        fromChainApi: api,
        toChainApi: apiDestination,
        hopApiOverrides,
      },
      abortSignal,
    );
  },
  key: ({ network, xcmChain }) => `fakeXcmFeeCalculation-${network.chain.chainId}-${xcmChain.chainId}`,
});

const getXcmFeesFx = takeLast({
  fn: async (params: FeeCalculationParams, abortSignal: AbortSignal) => {
    const { api, apiDestination, network, xcmChain, destination, rawAmount, initiatorAccountId, hopApiOverrides } =
      params;

    if (network.chain.chainId === xcmChain.chainId) {
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
        fromChainApi: api,
        toChainApi: apiDestination,
        hopApiOverrides,
      },
      abortSignal,
    );
  },
  key: () => 'xcmFeeCalculation',
});

const $fakeFeeCalculationParams = combine(
  {
    api: $api,
    apiDestination: $apiDestination,
    network: $networkStore,
    xcmChain: $xcmChain,
    hopApiOverrides: $hopApiOverrides,
  },
  ({ api, apiDestination, network, xcmChain, hopApiOverrides }) => {
    if (!api || !apiDestination || !network || !xcmChain) {
      return null;
    }

    if (network.chain.chainId === xcmChain.chainId) {
      return null;
    }

    return {
      api,
      apiDestination,
      network,
      xcmChain,
      hopApiOverrides,
    };
  },
);

const $feeCalculationParams = combine(
  {
    api: $api,
    apiDestination: $apiDestination,
    network: $networkStore,
    xcmChain: $xcmChain,
    destination: $destination,
    rawAmount: $rawAmount,
    initiatorAccountId: $initiatorAccountId,
    hopApiOverrides: $hopApiOverrides,
  },
  ({ api, apiDestination, network, xcmChain, destination, rawAmount, initiatorAccountId, hopApiOverrides }) => {
    if (!api || !apiDestination || !network || !xcmChain || !destination || !rawAmount) {
      return null;
    }

    if (network.chain.chainId === xcmChain.chainId) {
      return null;
    }

    return {
      api,
      apiDestination,
      network,
      xcmChain,
      destination,
      rawAmount,
      initiatorAccountId,
      hopApiOverrides,
    };
  },
);

sample({
  clock: xcmChainSelected,
  source: $fakeFeeCalculationParams,
  filter: (params): params is FakeFeeCalculationParams => params !== null,
  target: getXcmFeesWithFakeDataFx,
});

sample({
  clock: [rawAmountChangedDebounced, destinationChangedDebounced],
  source: $feeCalculationParams,
  filter: (params): params is FeeCalculationParams => params !== null,
  target: getXcmFeesFx,
});

const isAbortError = (err: unknown) => err && typeof err === 'object' && 'name' in err && err.name === 'AbortError';

sample({
  clock: getXcmFeesWithFakeDataFx.doneData,
  source: { destination: $destination, rawAmount: $rawAmount },
  filter: ({ destination, rawAmount }) => !destination || !rawAmount,
  fn: (_source, fees) => fees?.destinationFee ?? null,
  target: $destinationFee,
});

sample({
  clock: getXcmFeesWithFakeDataFx.doneData,
  source: { destination: $destination, rawAmount: $rawAmount },
  filter: ({ destination, rawAmount }) => !destination || !rawAmount,
  fn: (_source, fees) => fees?.originFee ?? null,
  target: $originFee,
});

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
  clock: getXcmFeesWithFakeDataFx.failData,
  source: { destination: $destination, rawAmount: $rawAmount },
  filter: ({ destination, rawAmount }, error) => !isAbortError(error) && (!destination || !rawAmount),
  fn: () => null,
  target: $destinationFee,
});

sample({
  clock: getXcmFeesWithFakeDataFx.failData,
  source: { destination: $destination, rawAmount: $rawAmount },
  filter: ({ destination, rawAmount }, error) => !isAbortError(error) && (!destination || !rawAmount),
  fn: () => null,
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
  clock: xcmChainSelected,
  fn: () => null,
  target: $destinationFee,
});

sample({
  clock: xcmChainSelected,
  fn: () => null,
  target: $originFee,
});

const $isDestinationFeeLoading = combine(
  {
    isPending: getXcmFeesFx.pending,
    isFakePending: getXcmFeesWithFakeDataFx.pending,
    feeParams: $feeCalculationParams,
    fakeFeeParams: $fakeFeeCalculationParams,
    destination: $destination,
    rawAmount: $rawAmount,
  },
  ({ isPending, isFakePending, feeParams, fakeFeeParams, destination, rawAmount }) => {
    const hasRealData = feeParams !== null;
    const hasFakeData = fakeFeeParams !== null && !hasRealData;
    const hasBothRealFields = destination !== null && rawAmount !== null;

    if (hasRealData) {
      return isPending;
    }

    if (hasFakeData && !hasBothRealFields) {
      return isFakePending;
    }

    return false;
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

const $transferDirections = createStore<string[]>([]).reset(xcmStarted, xcmStopped);

sample({
  clock: xcmStarted,
  fn: ({ chain, asset }) => spellXcmService.getAvailableTransfers(chain, asset),
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
    if (!xcmChainId || !transferDirections || !network) {
      return undefined;
    }

    const selectedChain = chains[xcmChainId];
    if (!selectedChain) {
      return undefined;
    }

    const selectedChainName = spellXcmService.getSpellChainName(selectedChain);
    if (!selectedChainName) {
      return undefined;
    }

    const isAvailable = transferDirections.includes(selectedChainName);
    if (!isAvailable) {
      return undefined;
    }

    const destinationAsset = selectedChain.assets.find((asset) => asset.symbol === network.asset.symbol);

    return {
      destination: {
        chainId: toLocalChainId(selectedChain.chainId),
        assetId: destinationAsset?.assetId ?? network.asset.assetId,
      },
    };
  },
  { skipVoid: false },
);

type BuildTransferParams = {
  api: ApiPromise;
  apiDestination: ApiPromise;
  network: { chain: Chain; asset: Asset };
  xcmChain: Chain;
  destination: AccountId;
  amount: string;
  initiatorAccountId: AccountId | null;
  hopApiOverrides: Record<string, ApiPromise>;
};

const buildTransferFx = takeLast({
  fn: async (
    {
      api,
      apiDestination,
      network,
      xcmChain,
      destination,
      amount,
      initiatorAccountId,
      hopApiOverrides,
    }: BuildTransferParams,
    abortSignal: AbortSignal,
  ) => {
    if (network.chain.chainId === xcmChain.chainId) {
      return null;
    }

    if (!amount || amount === '0' || amount === '0.' || amount === '0.0') {
      return null;
    }

    const fromChainName = spellXcmService.getSpellChainName(network.chain);
    const toChainName = spellXcmService.getSpellChainName(xcmChain);

    if (!fromChainName || !toChainName) {
      return null;
    }

    if (!validateAddress(destination, xcmChain)) {
      return null;
    }

    const destinationAddress = spellXcmService.prepareAddressForChain(destination, xcmChain, toChainName);

    let senderAddress: string | undefined;
    if (initiatorAccountId) {
      senderAddress = spellXcmService.prepareAddressForChain(initiatorAccountId, network.chain, fromChainName);
    }

    let isAborted = false;
    const checkAborted = () => {
      if (abortSignal.aborted) {
        isAborted = true;
      }
      return isAborted;
    };

    const result = await spellXcmService.buildTransfer({
      fromChain: network.chain,
      toChain: xcmChain,
      asset: network.asset,
      amount,
      destinationAddress,
      senderAddress,
      fromChainApi: api,
      toChainApi: apiDestination,
      hopApiOverrides,
      onDryRunResult: (dryRunResult) => {
        if (checkAborted()) {
          return;
        }

        const hasFailureReason = Boolean(dryRunResult?.failureReason);
        const hasFailureChain = Boolean(dryRunResult?.failureChain);
        const hasDestinationFailure = dryRunResult?.destination?.success === false;

        if (dryRunResult && (hasFailureReason || hasFailureChain || hasDestinationFailure)) {
          const error = normalizeXcmError(
            dryRunResult.failureReason || dryRunResult.destination?.failureReason,
            dryRunResult.failureSubReason || dryRunResult.destination?.failureSubReason,
          );
          const failureChain = dryRunResult.failureChain;
          const isDryRunApiUnavailable = error.toLowerCase().includes('dryrunapi is not available');

          if (!isDryRunApiUnavailable) {
            buildTransferDryRunResult({
              success: false,
              failureReason: error,
              failureChain,
            });
          }
        }
      },
    });

    if (checkAborted()) {
      return null;
    }

    return result.extrinsic;
  },
  key: ({ network, xcmChain, destination }) => `${network.chain.chainId}-${xcmChain.chainId}-${destination}`,
});

const $spellExtrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null).reset(xcmStarted, xcmStopped);

const $buildTransferParams = combine(
  {
    api: $api,
    apiDestination: $apiDestination,
    network: $networkStore,
    xcmChain: $xcmChain,
    destination: $destination,
    rawAmount: $rawAmount,
    initiatorAccountId: $initiatorAccountId,
    hopApiOverrides: $hopApiOverrides,
    destinationFee: $destinationFee,
    isFeeLoading: getXcmFeesFx.pending,
    feeCalculationParams: $feeCalculationParams,
  },
  ({
    api,
    apiDestination,
    network,
    xcmChain,
    destination,
    rawAmount,
    initiatorAccountId,
    hopApiOverrides,
    destinationFee,
    isFeeLoading,
    feeCalculationParams,
  }) => {
    if (!api || !apiDestination || !network || !xcmChain || !destination || !rawAmount) {
      return null;
    }

    if (network.chain.chainId === xcmChain.chainId) {
      return null;
    }

    if (!validateAddress(String(destination), xcmChain)) {
      return null;
    }

    if (rawAmount === '0' || rawAmount === '0.' || rawAmount === '0.0') {
      return null;
    }

    const canCalculateFees = feeCalculationParams !== null;
    const feesNotReady = destinationFee === null;
    const isActivelyCalculatingFees = canCalculateFees && feesNotReady && isFeeLoading;

    if (isActivelyCalculatingFees) {
      return null;
    }

    let adjustedAmount = rawAmount;
    if (destinationFee && !destinationFee.isZero()) {
      const rawAmountBN = toPrecision(rawAmount, network.asset.precision);
      const adjustedAmountBN = rawAmountBN.add(destinationFee);
      adjustedAmount = toAssetPrecision(adjustedAmountBN, network.asset.precision);
    }

    return {
      api,
      apiDestination,
      network,
      xcmChain,
      destination,
      amount: adjustedAmount,
      initiatorAccountId,
      hopApiOverrides,
    };
  },
);

sample({
  clock: [destinationChangedDebounced, rawAmountChangedDebounced],
  fn: () => null,
  target: buildTransferDryRunResult,
});

sample({
  clock: [
    destinationChangedDebounced,
    rawAmountChangedDebounced,
    $destinationFee,
    getXcmFeesFx.done,
    getXcmFeesFx.fail,
  ],
  source: $buildTransferParams,
  filter: (params): params is BuildTransferParams => params !== null,
  target: buildTransferFx,
});

sample({
  clock: buildTransferFx.doneData,
  filter: (extrinsic): extrinsic is SubmittableExtrinsic<'promise'> => extrinsic !== null,
  fn: (extrinsic) => extrinsic,
  target: $spellExtrinsic,
});

sample({
  clock: buildTransferFx.fail,
  fn: () => null,
  target: $spellExtrinsic,
});

sample({
  clock: [xcmChainSelected, destinationChanged, rawAmountChanged],
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

sample({
  clock: [rawAmountChanged, destinationChanged, xcmChainSelected, xcmStarted, xcmStopped],
  fn: () => null,
  target: buildTransferDryRunResult,
});

sample({
  clock: $buildTransferParams,
  filter: (params) => params === null,
  fn: () => null,
  target: buildTransferDryRunResult,
});

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
  $buildTransferDryRunResult,
  $hopApiOverrides,

  events: {
    xcmStarted,
    xcmStopped,
    xcmChainSelected,
    rawAmountChanged,
    destinationChanged,
    initiatorAccountIdChanged,
  },
};
