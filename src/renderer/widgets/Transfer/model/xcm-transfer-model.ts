import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample } from 'effector';

import { type XcmConfig, XcmTransferType, xcmService } from '@/shared/api/xcm';
import { type AccountId, type Asset, type Chain, type ChainId } from '@/shared/core';
import { getParachainId, toLocalChainId } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { xcmModel } from '@/entities/xcm';
import { xcmTransferUtils } from '../lib/xcm-transfer-utils';

const xcmStarted = createEvent<{ chain: Chain; asset: Asset }>();
const xcmConfigLoaded = createEvent();
const xcmChainSelected = createEvent<ChainId>();
const xcmFeeChanged = createEvent<string>();
const isXcmFeeLoadingChanged = createEvent<boolean>();
const amountChanged = createEvent<string>();
const destinationChanged = createEvent<AccountId>();

const $config = createStore<XcmConfig | null>(null);
const $networkStore = restore(xcmStarted, null);
const $xcmChain = restore(xcmChainSelected, null);
const $xcmFee = restore(xcmFeeChanged, '0');
const $isXcmFeeLoading = restore(isXcmFeeLoadingChanged, true);
const $xcmParaId = createStore<number | null>(null);

const $amount = restore(amountChanged, null);
const $destination = restore<AccountId>(destinationChanged, null);

const getConfigFx = attach({ effect: xcmModel.effects.getConfigFx });
const saveConfigFx = attach({ effect: xcmModel.effects.saveConfigFx });
const fetchConfigFx = attach({ effect: xcmModel.effects.fetchConfigFx });

const getXcmParaIdFx = createEffect((api: ApiPromise): Promise<number | null> => {
  try {
    return getParachainId(api);
  } catch {
    return Promise.resolve(null);
  }
});

const $xcmAsset = combine(
  {
    config: $config,
    network: $networkStore,
  },
  ({ config, network }) => {
    if (!network || !config) return undefined;

    const originChainId = toLocalChainId(network.chain.chainId);
    const chainConfig = config.chains.find((c) => c.chainId === originChainId);

    return chainConfig?.assets.find((a) => a.assetId === network.asset.assetId);
  },
  { skipVoid: false },
);

const $transferDirections = combine(
  {
    config: $config,
    network: $networkStore,
  },
  ({ config, network }) => {
    if (!network || !config) return undefined;

    return xcmService.getAvailableTransfers(config.chains, network.asset.assetId, network.chain.chainId);
  },
  { skipVoid: false },
);

const $transferDirection = combine(
  {
    xcmChain: $xcmChain,
    xcmAsset: $xcmAsset,
  },
  ({ xcmChain, xcmAsset }) => {
    if (!xcmChain || !xcmAsset) return undefined;

    const xcmChainId = toLocalChainId(xcmChain);

    return xcmAsset?.xcmTransfers.find((t) => t.destination.chainId === xcmChainId);
  },
  { skipVoid: false },
);

const $xcmWeight = combine(
  {
    config: $config,
    transferDirection: $transferDirection,
    xcmAsset: $xcmAsset,
  },
  ({ config, transferDirection, xcmAsset }) => {
    if (!config || !transferDirection || !xcmAsset) return '';

    const weight = xcmService.getEstimatedRequiredDestWeight(
      config,
      config.assetsLocation[xcmAsset.assetLocation],
      transferDirection.destination.chainId,
      transferDirection,
    );

    return weight.toString();
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? apis[network.chain.chainId] : undefined;
  },
  { skipVoid: false },
);

const $apiDestination = combine(
  {
    apis: networkModel.$apis,
    transferDirection: $transferDirection,
  },
  ({ apis, transferDirection }) => {
    if (!transferDirection) return undefined;

    return apis[`0x${transferDirection.destination.chainId}` as ChainId];
  },
  { skipVoid: false },
);

const $txDestination = combine(
  {
    api: $api,
    destination: $destination,
    network: $networkStore,
    xcmParaId: $xcmParaId,
    transferDirection: $transferDirection,
  },
  (params) => {
    const { api, destination, network, xcmParaId, transferDirection } = params;

    if (!api || !network || xcmParaId === null || !transferDirection) return undefined;

    if (transferDirection.type === XcmTransferType.XTOKENS && destination) {
      return xcmService.getVersionedDestinationLocation(
        api,
        transferDirection.type,
        network.chain,
        xcmParaId || undefined,
        destination,
      );
    }

    return xcmService.getVersionedDestinationLocation(
      api,
      transferDirection.type,
      network.chain,
      xcmParaId || undefined,
    );
  },
  { skipVoid: false },
);

const $txBeneficiary = combine(
  {
    api: $api,
    destination: $destination,
    transferDirection: $transferDirection,
  },
  ({ api, destination, transferDirection }) => {
    if (!api || !destination || !transferDirection) return undefined;

    return xcmService.getVersionedAccountLocation(api, transferDirection.type, destination);
  },
  // TODO: Remove skipVoid
  { skipVoid: false },
);

const $txAsset = combine(
  {
    api: $api,
    config: $config,
    amount: $amount,
    transferDirection: $transferDirection,
    xcmAsset: $xcmAsset,
    xcmFee: $xcmFee,
  },
  (params) => {
    const { api, config, transferDirection, xcmAsset } = params;

    if (!api || !config || !transferDirection || !xcmAsset) return undefined;

    const resultAmount = new BN(params.amount || 0).add(new BN(params.xcmFee || 0));
    const isArray = transferDirection.type !== XcmTransferType.XTOKENS;

    return xcmService.getAssetLocation(
      api,
      transferDirection.type,
      xcmAsset,
      config.assetsLocation,
      resultAmount,
      isArray,
    );
  },
  { skipVoid: false },
);

const $xcmData = combine(
  {
    api: $api,
    xcmFee: $xcmFee,
    xcmAsset: $txAsset,
    xcmChain: $xcmChain,
    xcmWeight: $xcmWeight,
    xcmDest: $txDestination,
    xcmBeneficiary: $txBeneficiary,
    transferDirection: $transferDirection,
  },
  ({ api, xcmChain, transferDirection, ...rest }) => {
    if (!api || !transferDirection || !xcmChain) return undefined;

    const transactionType = xcmTransferUtils.getXcmTransferType(api, transferDirection.type);

    return {
      transactionType,
      args: { destinationChain: xcmChain, ...rest },
    };
  },
  { skipVoid: false },
);

const $parentChainApi = combine(
  {
    network: $networkStore,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  ({ network, chains, apis }) => {
    if (!chains || !apis || !network) return null;

    const parentChain = xcmService.getParentChain(network.chain, chains);

    return apis[parentChain.chainId] ?? null;
  },
);

sample({
  clock: xcmStarted,
  target: xcmConfigLoaded,
});

sample({
  clock: xcmConfigLoaded,
  target: [getConfigFx, fetchConfigFx],
});

sample({
  clock: getConfigFx.doneData,
  filter: Boolean,
  target: $config,
});

sample({
  clock: fetchConfigFx.doneData,
  target: [saveConfigFx, $config],
});

sample({
  clock: xcmChainSelected,
  source: networkModel.$apis,
  filter: (apis, chainId) => Boolean(apis[chainId]),
  fn: (apis, chainId) => apis[chainId],
  target: getXcmParaIdFx,
});

sample({
  clock: getXcmParaIdFx.doneData,
  filter: (xcmParaId) => xcmParaId !== null,
  target: $xcmParaId,
});

export const xcmTransferModel = {
  $config,
  $apiDestination,
  $parentChainApi,
  $xcmData,
  $xcmFee,
  $isXcmFeeLoading,
  $transferDirections,
  $xcmParaId,

  events: {
    xcmStarted,
    xcmConfigLoaded,
    xcmChainSelected,
    xcmFeeChanged,
    isXcmFeeLoadingChanged,
    amountChanged,
    destinationChanged,
  },
};
