import { createStore, createEffect, createEvent, sample, forward, attach } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { createGate } from 'effector-react';

import {
  XcmConfig,
  XcmTransfer,
  getAvailableDirections,
  AssetXCM,
  getAssetLocation,
  getVersionedAccountLocation,
  estimateRequiredDestWeight,
  getVersionedDestinationLocation,
  XcmTransferType,
} from '@shared/api/xcm';
import { xcmModel } from '@entities/xcm';
import { getParachainId } from '@renderer/services/dataVerification/dataVerification';
import { toLocalChainId } from '@shared/lib/utils';
import type { AccountId, Asset, Chain, ChainId } from '@shared/core';
import { networkModel } from '@entities/network';

const xcmConfigRequested = createEvent();
const destinationChainSelected = createEvent<ChainId>();
const accountIdSelected = createEvent<AccountId>();
const amountChanged = createEvent<string>();
const xcmFeeChanged = createEvent<string>();
const storeCleared = createEvent();

export const $destinationChain = createStore<ChainId | null>(null).reset(storeCleared);
export const $finalConfig = createStore<XcmConfig | null>(null);
export const $xcmTransfer = createStore<XcmTransfer | null>(null).reset(storeCleared);
export const $xcmAsset = createStore<AssetXCM | null>(null).reset(storeCleared);
export const $destinations = createStore<XcmTransfer[] | []>([]).reset(storeCleared);
export const $destinationParaId = createStore<number | null>(null).reset(storeCleared);
export const $accountId = createStore<AccountId | null>(null).reset(storeCleared);

export const $txDest = createStore<Object | null>(null).reset(storeCleared);
export const $txBeneficiary = createStore<Object | null>(null).reset(storeCleared);
export const $txAsset = createStore<Object | null>(null).reset(storeCleared);
export const $xcmFee = createStore<string>('').reset(storeCleared);
export const $amount = createStore<string>('').reset(storeCleared);
export const $xcmWeight = createStore<string>('').reset(storeCleared);

export const $xcmProps = createStore<{
  chain?: Chain;
  asset?: Asset;
  api?: ApiPromise;
}>({}).reset(storeCleared);

export const PropsGate = createGate<{ chain: Chain; asset: Asset; api?: ApiPromise }>('props');

const calculateFinalConfigFx = createEffect((config: XcmConfig): XcmConfig => {
  return config;
});

const getConfigFx = attach({ effect: xcmModel.effects.getConfigFx });
const saveConfigFx = attach({ effect: xcmModel.effects.saveConfigFx });
const fetchConfigFx = attach({ effect: xcmModel.effects.fetchConfigFx });

const getParaIdFx = createEffect(async (api: ApiPromise): Promise<number | null> => {
  try {
    return getParachainId(api);
  } catch (e) {
    return null;
  }
});

forward({ from: PropsGate.state, to: $xcmProps });

forward({
  from: xcmConfigRequested,
  to: [getConfigFx, fetchConfigFx],
});

sample({
  source: { props: $xcmProps, config: $finalConfig },
  fn: ({ config, props: { chain, asset } }) => {
    if (!config || !asset || !chain) return [];

    return getAvailableDirections(config.chains, asset.assetId, chain.chainId);
  },
  target: $destinations,
});

sample({
  clock: destinationChainSelected,
  fn: (chain) => chain,
  target: $destinationChain,
});

sample({
  clock: destinationChainSelected,
  source: networkModel.$apis,
  filter: (apis, chainId): boolean => Boolean(apis[chainId]),
  fn: (apis, chainId) => apis[chainId],
  target: getParaIdFx,
});

forward({
  from: getParaIdFx.doneData,
  to: $destinationParaId,
});

sample({
  source: {
    props: $xcmProps,
    config: $finalConfig,
  },
  fn: ({ config, props: { chain, asset } }) => {
    if (!config || !chain || !asset) return null;

    const originChainId = toLocalChainId(chain.chainId);
    const configChain = config.chains.find((c) => c.chainId === originChainId);
    const configAsset = configChain?.assets.find((a) => a.assetId === asset.assetId);

    return configAsset || null;
  },
  target: $xcmAsset,
});

sample({
  source: {
    chainId: $destinationChain,
    xcmAsset: $xcmAsset,
  },
  fn: ({ xcmAsset, chainId }) => {
    if (!xcmAsset || !chainId) return null;

    const destinationChainId = toLocalChainId(chainId);
    const configXcmTransfer = xcmAsset?.xcmTransfers.find((t) => t.destination.chainId === destinationChainId);

    return configXcmTransfer || null;
  },
  target: $xcmTransfer,
});

sample({
  source: {
    xcmTransfer: $xcmTransfer,
    props: $xcmProps,
    accountId: $accountId,
    paraId: $destinationParaId,
  },
  fn: ({ xcmTransfer, props: { api, chain }, paraId, accountId }) => {
    if (!xcmTransfer || !chain || !api) return null;

    return (
      (xcmTransfer.type === XcmTransferType.XTOKENS && accountId
        ? getVersionedDestinationLocation(api, xcmTransfer.type, chain, paraId || undefined, accountId)
        : getVersionedDestinationLocation(api, xcmTransfer.type, chain, paraId || undefined)) || null
    );
  },
  target: $txDest,
});

forward({
  from: accountIdSelected,
  to: $accountId,
});

sample({
  source: { accountId: $accountId, props: $xcmProps, xcmTransfer: $xcmTransfer },
  fn: ({ xcmTransfer, accountId, props: { api } }) => {
    if (!accountId || accountId === '0x00' || !api || !xcmTransfer) return null;

    return getVersionedAccountLocation(api, xcmTransfer.type, accountId) || null;
  },
  target: $txBeneficiary,
});

forward({
  from: xcmFeeChanged,
  to: $xcmFee,
});

sample({
  source: {
    config: $finalConfig,
    xcmTransfer: $xcmTransfer,
    asset: $xcmAsset,
    props: $xcmProps,
  },
  fn: ({ config, xcmTransfer, props: { chain }, asset }) => {
    if (!config || !xcmTransfer || !chain || !asset) return '';

    return estimateRequiredDestWeight(
      config,
      config.assetsLocation[asset.assetLocation],
      toLocalChainId(chain.chainId)!,
      xcmTransfer,
    ).toString();
  },
  target: $xcmWeight,
});

sample({
  source: {
    config: $finalConfig,
    props: $xcmProps,
    amount: $amount,
    xcmTransfer: $xcmTransfer,
    xcmAsset: $xcmAsset,
    xcmFee: $xcmFee,
  },
  fn: ({ props: { api }, xcmAsset, config, amount, xcmTransfer, xcmFee }) => {
    if (!api || !xcmAsset || !config || !xcmTransfer) return null;

    const resultAmount = new BN(amount || 0).add(new BN(xcmFee || 0));
    const isArray = xcmTransfer.type !== XcmTransferType.XTOKENS;

    return getAssetLocation(api, xcmTransfer.type, xcmAsset, config.assetsLocation, resultAmount, isArray) || null;
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
  xcmFeeChanged,
  storeCleared,
};
