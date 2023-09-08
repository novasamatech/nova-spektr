import { createStore, createEffect, createEvent, sample, forward, attach } from 'effector';
import { VersionedMultiAssets, VersionedMultiLocation } from '@polkadot/types/interfaces';
import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import {
  XcmConfig,
  XcmTransfer,
  getAvailableDirections,
  AssetXCM,
  getDestinationLocation,
  estimateFee,
  getAssetLocation,
} from '@renderer/shared/api/xcm';
import { xcmModel } from '@renderer/entities/xcm';
import { Chain } from '@renderer/entities/chain';
import { Asset } from '@renderer/entities/asset';
import * as assetGuardModel from '@renderer/features/assets/AssetRouteGuard/model/asset-guard';
import { getParachainId } from '@renderer/services/dataVerification/dataVerification';
import { ExtendedChain } from '@renderer/entities/network';
import { AccountId } from '@renderer/domain/shared-kernel';

export const $destinationChain = createStore<ExtendedChain | null>(null);
export const $finalConfig = createStore<XcmConfig | null>(null);
export const $xcmTransfer = createStore<XcmTransfer | null>(null);
export const $xcmAsset = createStore<AssetXCM | null>(null);
export const $destinations = createStore<XcmTransfer[] | []>([]);
export const $api = createStore<ApiPromise | null>(null);
export const $destinationParaId = createStore<number | null>(null);
export const $accountId = createStore<AccountId | null>(null);

export const $txDest = createStore<VersionedMultiLocation | null>(null);
export const $txBeneficiary = createStore<VersionedMultiLocation | null>(null);
export const $txAsset = createStore<VersionedMultiAssets | null>(null);
export const $xcmFee = createStore<string>('');
export const $amount = createStore<string>('');

const xcmConfigRequested = createEvent();
const destinationChainSelected = createEvent<ExtendedChain>();
const apiInited = createEvent<ApiPromise>();
const accountIdSelected = createEvent<AccountId>();
const amountChanged = createEvent<string>();

// TODO: continue config calculation in xcm service task
const calculateFinalConfigFx = createEffect((config: XcmConfig): XcmConfig => {
  return config;
});

const getConfigFx = attach({ effect: xcmModel.effects.getConfigFx });
const saveConfigFx = attach({ effect: xcmModel.effects.saveConfigFx });
const fetchConfigFx = attach({ effect: xcmModel.effects.fetchConfigFx });

const getParaIdFx = createEffect(async (api: ApiPromise): Promise<number | null> => {
  try {
    return await getParachainId(api);
  } catch (e) {
    return null;
  }
});

forward({
  from: xcmConfigRequested,
  to: [getConfigFx, fetchConfigFx],
});

sample({
  source: { asset: assetGuardModel.$asset, chain: assetGuardModel.$chain, config: $finalConfig },
  filter: (props: {
    asset: Asset | null;
    chain: Chain | null;
    config: XcmConfig | null;
  }): props is { asset: Asset; chain: Chain; config: XcmConfig } =>
    Boolean(props.config) && Boolean(props.chain) && Boolean(props.asset),
  fn: ({ config, asset, chain }) => getAvailableDirections(config.chains, asset.assetId, chain.chainId),
  target: $destinations,
});

forward({
  from: apiInited,
  to: $api,
});

sample({
  clock: destinationChainSelected,
  fn: (chain) => chain,
  target: $destinationChain,
});

sample({
  clock: destinationChainSelected,
  filter: (chain: ExtendedChain): chain is ExtendedChain & { api: ApiPromise } => Boolean(chain.api),
  fn: ({ api }) => api,
  target: getParaIdFx,
});

forward({
  from: getParaIdFx.doneData,
  to: $destinationParaId,
});

sample({
  source: {
    chain: assetGuardModel.$chain,
    asset: assetGuardModel.$asset,
    config: $finalConfig,
  },
  fn: ({ config, chain, asset }) => {
    if (!config || !chain || !asset) return null;

    const originChainId = chain.chainId.replace('0x', '');
    const configChain = config.chains.find((c) => c.chainId === originChainId);
    const configAsset = configChain?.assets.find((a) => a.assetId === asset.assetId);

    return configAsset || null;
  },
  target: $xcmAsset,
});

sample({
  source: {
    destinationChain: $destinationChain,
    xcmAsset: $xcmAsset,
  },
  fn: ({ xcmAsset, destinationChain }) => {
    if (!xcmAsset || !destinationChain) return null;

    const destinationChainId = destinationChain.chainId.replace('0x', '');
    const configXcmTransfer = xcmAsset?.xcmTransfers.find((t) => t.destination.chainId === destinationChainId);

    return configXcmTransfer || null;
  },
  target: $xcmTransfer,
});

sample({
  source: { xcmTransfer: $xcmTransfer, chain: assetGuardModel.$chain, api: $api, paraId: $destinationParaId },
  fn: ({ xcmTransfer, api, chain, paraId }) => {
    if (!xcmTransfer || !api || !chain || !paraId) return null;

    return getDestinationLocation(api, chain, paraId) || null;
  },
  target: $txDest,
});

forward({
  from: accountIdSelected,
  to: $accountId,
});

sample({
  source: {
    xcmTransfer: $xcmTransfer,
    chain: assetGuardModel.$chain,
    api: $api,
    paraId: $destinationParaId,
    accountId: $accountId,
  },
  fn: ({ xcmTransfer, api, chain, paraId, accountId }) => {
    if (!xcmTransfer || !api || !chain || !paraId || !accountId || accountId === '0x00') return null;

    return getDestinationLocation(api, chain, paraId, accountId) || null;
  },
  target: $txBeneficiary,
});

sample({
  source: {
    xcmTransfer: $xcmTransfer,
    chain: assetGuardModel.$chain,
    api: $api,
    xcmAsset: $xcmAsset,
    config: $finalConfig,
  },
  fn: ({ xcmTransfer, api, chain, xcmAsset, config }) => {
    if (!xcmTransfer || !api || !chain || !xcmAsset || !config) return '';

    return estimateFee(config, config.assetsLocation[xcmAsset.assetLocation], chain.chainId, xcmTransfer).toString();
  },
  target: $xcmFee,
});

sample({
  source: {
    config: $finalConfig,
    api: $api,
    amount: $amount,
    xcmAsset: $xcmAsset,
    xcmFee: $xcmFee,
  },
  fn: ({ api, xcmAsset, config, amount, xcmFee }) => {
    if (!api || !xcmAsset || !amount || !config || !xcmFee) return null;

    return getAssetLocation(api, xcmAsset, config.assetsLocation, new BN(amount).add(new BN(xcmFee))) || null;
  },
  target: $txAsset,
});

sample({
  clock: getConfigFx.doneData,
  filter: (config): config is XcmConfig => Boolean(config),
  target: calculateFinalConfigFx,
});

forward({
  from: amountChanged,
  to: $amount,
});

forward({
  from: fetchConfigFx.doneData,
  to: [saveConfigFx, calculateFinalConfigFx],
});

forward({
  from: calculateFinalConfigFx.doneData,
  to: $finalConfig,
});

export const events = {
  xcmConfigRequested,
  destinationChainSelected,
  accountIdSelected,
  amountChanged,
  apiInited,
};
