import { createStore, createEffect, createEvent, sample, forward, attach } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { createGate } from 'effector-react';

import {
  XcmConfig,
  XcmTransfer,
  getAvailableDirections,
  AssetXCM,
  getDestinationLocation,
  getAssetLocation,
  getAccountLocation,
  estimateRequiredDestWeight,
} from '@renderer/shared/api/xcm';
import { xcmModel } from '@renderer/entities/xcm';
import { Chain } from '@renderer/entities/chain';
import { Asset } from '@renderer/entities/asset';
import { getParachainId } from '@renderer/services/dataVerification/dataVerification';
import { ExtendedChain } from '@renderer/entities/network';
import { AccountId } from '@renderer/domain/shared-kernel';
import { toLocalChainId } from '@renderer/shared/lib/utils';

const xcmConfigRequested = createEvent();
const destinationChainSelected = createEvent<ExtendedChain>();
const apiInited = createEvent<ApiPromise>();
const accountIdSelected = createEvent<AccountId>();
const amountChanged = createEvent<string>();
const xcmFeeChanged = createEvent<string>();
const storeCleared = createEvent();

export const $destinationChain = createStore<ExtendedChain | null>(null).reset(storeCleared);
export const $finalConfig = createStore<XcmConfig | null>(null);
export const $xcmTransfer = createStore<XcmTransfer | null>(null).reset(storeCleared);
export const $xcmAsset = createStore<AssetXCM | null>(null).reset(storeCleared);
export const $destinations = createStore<XcmTransfer[] | []>([]).reset(storeCleared);
export const $api = createStore<ApiPromise | null>(null).reset(storeCleared);
export const $destinationParaId = createStore<number | null>(null).reset(storeCleared);
export const $accountId = createStore<AccountId | null>(null).reset(storeCleared);
export const $chain = createStore<Chain | null>(null);
export const $asset = createStore<Asset | null>(null);

export const $txDest = createStore<Object | null>(null).reset(storeCleared);
export const $txBeneficiary = createStore<Object | null>(null).reset(storeCleared);
export const $txAsset = createStore<Object | null>(null).reset(storeCleared);
export const $xcmFee = createStore<string>('').reset(storeCleared);
export const $amount = createStore<string>('').reset(storeCleared);
export const $xcmWeight = createStore<string>('').reset(storeCleared);

export const PropsGate = createGate<{ chain: Chain; asset: Asset }>('props');

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

sample({ clock: PropsGate.state, fn: ({ asset }) => asset, target: $asset });
sample({ clock: PropsGate.state, fn: ({ chain }) => chain, target: $chain });

forward({
  from: xcmConfigRequested,
  to: [getConfigFx, fetchConfigFx],
});

sample({
  source: { asset: $asset, chain: $chain, config: $finalConfig },
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
    chain: $chain,
    asset: $asset,
    config: $finalConfig,
  },
  fn: ({ config, chain, asset }) => {
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
    destinationChain: $destinationChain,
    xcmAsset: $xcmAsset,
  },
  fn: ({ xcmAsset, destinationChain }) => {
    if (!xcmAsset || !destinationChain) return null;

    const destinationChainId = toLocalChainId(destinationChain.chainId);
    const configXcmTransfer = xcmAsset?.xcmTransfers.find((t) => t.destination.chainId === destinationChainId);

    return configXcmTransfer || null;
  },
  target: $xcmTransfer,
});

sample({
  source: {
    xcmTransfer: $xcmTransfer,
    chain: $chain,
    accountId: $accountId,
    paraId: $destinationParaId,
  },
  fn: ({ xcmTransfer, chain, paraId, accountId }) => {
    if (!xcmTransfer || !chain) return null;

    return (
      (xcmTransfer.type === 'xtokens' && accountId
        ? getDestinationLocation(chain, paraId || undefined, accountId)
        : getDestinationLocation(chain, paraId || undefined)) || null
    );
  },
  target: $txDest,
});

forward({
  from: accountIdSelected,
  to: $accountId,
});

sample({
  source: $accountId,

  fn: (accountId) => {
    if (!accountId || accountId === '0x00') return null;

    return getAccountLocation(accountId) || null;
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
    chain: $chain,
  },
  fn: ({ config, xcmTransfer, chain, asset }) => {
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
  xcmFeeChanged,
  storeCleared,
};
