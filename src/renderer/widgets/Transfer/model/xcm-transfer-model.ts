import { BN } from '@polkadot/util';
import { createStore, createEffect, createEvent, sample, attach, restore, combine } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { XcmConfig, XcmTransferType, xcmService } from '@shared/api/xcm';
import { toLocalChainId, getParachainId } from '@shared/lib/utils';
import type { AccountId, Asset, Chain, ChainId } from '@shared/core';
import { networkModel } from '@entities/network';
import { xcmModel } from '@entities/xcm';

const xcmStarted = createEvent<{ chain: Chain; asset: Asset }>();
const xcmChainSelected = createEvent<ChainId>();
const xcmFeeChanged = createEvent<string>();
const amountChanged = createEvent<string>();
const destinationChanged = createEvent<AccountId>();

const $config = createStore<XcmConfig | null>(null);
const $networkStore = restore(xcmStarted, null);
const $xcmChain = restore(xcmChainSelected, null);
const $xcmFee = restore(xcmFeeChanged, null);
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
    network: $networkStore,
    transferDirection: $transferDirection,
    xcmAsset: $xcmAsset,
  },
  ({ config, network, transferDirection, xcmAsset }) => {
    if (!config || !network || !transferDirection || !xcmAsset) return '';

    const weight = xcmService.getEstimatedRequiredDestWeight(
      config,
      config.assetsLocation[xcmAsset.assetLocation],
      toLocalChainId(network.chain.chainId)!,
      transferDirection,
    );

    return weight.toString();
  },
);

const $txDestination = combine(
  {
    apis: networkModel.$apis,
    destination: $destination,
    network: $networkStore,
    xcmParaId: $xcmParaId,
    transferDirection: $transferDirection,
  },
  ({ apis, destination, network, xcmParaId, transferDirection }) => {
    if (!network || xcmParaId === null || !transferDirection) return undefined;

    const chainId = `0x${transferDirection.destination.chainId}` as ChainId;
    if (!apis[chainId]) return undefined;

    if (transferDirection.type === XcmTransferType.XTOKENS && destination) {
      return xcmService.getVersionedDestinationLocation(
        apis[chainId],
        transferDirection.type,
        network.chain,
        xcmParaId || undefined,
        destination,
      );
    }

    return xcmService.getVersionedDestinationLocation(
      apis[chainId],
      transferDirection.type,
      network.chain,
      xcmParaId || undefined,
    );
  },
  { skipVoid: false },
);

const $txBeneficiary = combine(
  {
    apis: networkModel.$apis,
    destination: $destination,
    network: $networkStore,
    transferDirection: $transferDirection,
  },
  ({ apis, destination, network, transferDirection }) => {
    if (!destination || !network || !transferDirection) return undefined;

    const chainId = `0x${transferDirection.destination.chainId}` as ChainId;
    if (!apis[chainId]) return undefined;

    return xcmService.getVersionedAccountLocation(apis[chainId], transferDirection.type, destination);
  },
  { skipVoid: false },
);

const $txAsset = combine(
  {
    apis: networkModel.$apis,
    config: $config,
    network: $networkStore,
    amount: $amount,
    transferDirection: $transferDirection,
    xcmAsset: $xcmAsset,
    xcmFee: $xcmFee,
  },
  ({ apis, config, network, amount, transferDirection, xcmAsset, xcmFee }) => {
    if (!config || !network || !transferDirection || !xcmAsset) return undefined;

    const chainId = `0x${transferDirection.destination.chainId}` as ChainId;
    if (!apis[chainId]) return undefined;

    const resultAmount = new BN(amount || 0).add(new BN(xcmFee || 0));
    const isArray = transferDirection.type !== XcmTransferType.XTOKENS;

    return xcmService.getAssetLocation(
      apis[chainId],
      transferDirection.type,
      xcmAsset,
      config.assetsLocation,
      resultAmount,
      isArray,
    );
  },
  { skipVoid: false },
);

sample({
  clock: xcmStarted,
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
  $transferDirections,
  $xcmAsset,
  $xcmFee,
  $xcmWeight,

  $txDestination,
  $txBeneficiary,
  $txAsset,

  events: {
    xcmStarted,
    xcmChainSelected,
    xcmFeeChanged,
    amountChanged,
    destinationChanged,
  },
};
