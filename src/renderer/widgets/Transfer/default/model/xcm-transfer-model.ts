import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample } from 'effector';

import { type XcmConfig, XcmTransferType, xcmService } from '@/shared/api/xcm';
import { type Asset, type Chain, type ChainId } from '@/shared/core';
import { takeLast } from '@/shared/effector';
import { getParachainId, toLocalChainId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Extrinsic } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { xcmModel } from '@/entities/xcm';
import { xcmTransferUtils } from '../../shared/services/xcm-transfer-utils';

const xcmStarted = createEvent<{ chain: Chain; asset: Asset }>();
const xcmConfigLoaded = createEvent();
const xcmChainSelected = createEvent<ChainId>();
const xcmFeeChanged = createEvent<BN>();
const deliveryFeeRequested = createEvent<Extrinsic>();
const isXcmFeeLoadingChanged = createEvent<boolean>();
const amountChanged = createEvent<string>();
const destinationChanged = createEvent<AccountId | null>();

const $config = createStore<XcmConfig | null>(null);
const $networkStore = restore(xcmStarted, null);
const $xcmChainId = restore(xcmChainSelected, null);
const $xcmFee = createStore(BN_ZERO);
const $deliveryFee = createStore<BN>(BN_ZERO);
const $isXcmFeeLoading = restore(isXcmFeeLoadingChanged, true);
const $xcmParaId = createStore<number | null>(null);

const $amount = restore(amountChanged, null);
const $destination = restore(destinationChanged, null);

const getConfigFx = attach({ effect: xcmModel.effects.getConfigFx });
const saveConfigFx = attach({ effect: xcmModel.effects.saveConfigFx });
const fetchConfigFx = attach({ effect: xcmModel.effects.fetchConfigFx });

const getXcmParaIdFx = takeLast({
  fn: async (api: ApiPromise): Promise<number | null> => getParachainId(api),
  key: () => 'getXcmParaIdFx',
});

type DeliveryFeeParams = {
  api: ApiPromise | null;
  config: XcmConfig | null;
  parachainId: number | null;
  extrinsic?: SubmittableExtrinsic<'promise'> | null;
  destinationChain: Chain | null;
};
const getDeliveryFeeFx = createEffect(
  async ({ api, config, parachainId, extrinsic, destinationChain }: DeliveryFeeParams) => {
    if (!api || !config || !parachainId || !extrinsic || !destinationChain) {
      return null;
    }

    const originChainId = api.genesisHash.toHex();
    if (originChainId === destinationChain.chainId) {
      return null;
    }

    return xcmService.getDeliveryFeeFromConfig({
      config,
      originApi: api,
      originChain: toLocalChainId(originChainId),
      destinationChainId: parachainId,
      extrinsic,
      destinationChain,
    });
  },
);

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
    xcmChainId: $xcmChainId,
    xcmAsset: $xcmAsset,
  },
  ({ xcmChainId, xcmAsset }) => {
    if (!xcmChainId || !xcmAsset) return undefined;

    return xcmAsset?.xcmTransfers.find((t) => t.destination.chainId === toLocalChainId(xcmChainId));
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
    return network ? (apis[network.chain.chainId] ?? null) : null;
  },
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

    if (!api || !network || !transferDirection) return undefined;

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
    deliveryFee: $deliveryFee,
    xcmAsset: $txAsset,
    xcmChainId: $xcmChainId,
    xcmWeight: $xcmWeight,
    xcmDest: $txDestination,
    xcmBeneficiary: $txBeneficiary,
    transferDirection: $transferDirection,
  },
  ({ api, xcmChainId, transferDirection, deliveryFee, xcmFee, ...rest }) => {
    if (!api || !transferDirection || !xcmChainId) return undefined;

    const transactionType = xcmTransferUtils.getXcmTransferType(api, transferDirection.type);

    return {
      transactionType,
      args: { destinationChain: xcmChainId, deliveryFee: deliveryFee.toString(), xcmFee: xcmFee.toString(), ...rest },
    };
  },
  { skipVoid: false },
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
  target: $xcmParaId,
});

sample({
  clock: getXcmParaIdFx.failData,
  filter: (err) => {
    const isAbortError = err && 'name' in err && err.name === 'AbortError';
    return !isAbortError;
  },
  fn: () => null,
  target: $xcmParaId,
});

sample({
  clock: deliveryFeeRequested,
  source: {
    api: $api,
    parachainId: $xcmParaId,
    config: $config,
    xcmChain: $xcmChain,
  },
  fn: ({ xcmChain, ...rest }, extrinsic) => ({
    destinationChain: xcmChain,
    extrinsic,
    ...rest,
  }),
  target: getDeliveryFeeFx,
});

sample({
  clock: getDeliveryFeeFx.doneData,
  source: $deliveryFee,
  // there is ugly cyclic dependency between xcm related data and extrinsic, this is fix for infinite cyclic update.
  // TODO refactor this shit
  filter: (state, update) => {
    return !!update && !state.eq(update);
  },
  fn: (_, fee) => fee!,
  target: $deliveryFee,
});

sample({
  clock: [xcmChainSelected, getDeliveryFeeFx.fail],
  fn: () => BN_ZERO,
  target: $deliveryFee,
});

sample({
  clock: xcmFeeChanged,
  source: $xcmFee,
  // there is ugly cyclic dependency between xcm related data and extrinsic, this is fix for infinite cyclic update.
  // TODO refactor this shit
  filter: (state, update) => {
    return !!update && !state.eq(update);
  },
  fn: (_, fee) => fee,
  target: $xcmFee,
});

export const xcmTransferModel = {
  $config,
  $apiDestination,
  $xcmData,
  $xcmFee,
  $deliveryFee,
  $transferDirections,
  $xcmParaId,
  $xcmChainId,
  $xcmChain,
  $isXcmFeeLoading,
  $isDeliveryFeeLoading: getDeliveryFeeFx.pending,

  events: {
    xcmStarted,
    xcmConfigLoaded,
    xcmChainSelected,
    xcmFeeChanged,
    deliveryFeeRequested,
    isXcmFeeLoadingChanged,
    amountChanged,
    destinationChanged,
  },
};
