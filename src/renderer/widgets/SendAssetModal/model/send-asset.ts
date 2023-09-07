import { createStore, createEffect, createEvent, sample, forward, attach } from 'effector';

import { XcmConfig, AssetLocation, XcmTransfer, getAvailableDirections } from '@renderer/shared/api/xcm';
import { xcmModel } from '@renderer/entities/xcm';
import { Chain } from '@renderer/entities/chain';
import { Asset } from '@renderer/entities/asset';

export const $asset = createStore<Asset | null>(null);
export const $originChain = createStore<Chain | null>(null);
export const $destinationChain = createStore<Chain | null>(null);
export const $finalConfig = createStore<XcmConfig | null>(null);
export const $xcmTransfer = createStore<XcmTransfer | null>(null);
export const $assetLocation = createStore<AssetLocation | null>(null);
export const $destinations = createStore<XcmTransfer[] | []>([]);

type SendFormProps = { chain: Chain; asset: Asset };

const xcmConfigRequested = createEvent();
const formOpened = createEvent<SendFormProps>();
const destinationChainSelected = createEvent<Chain>();

// TODO: continue config calculation in xcm service task
const calculateFinalConfigFx = createEffect((config: XcmConfig): XcmConfig => {
  return config;
});

const getConfigFx = attach({ effect: xcmModel.effects.getConfigFx });
const saveConfigFx = attach({ effect: xcmModel.effects.saveConfigFx });
const fetchConfigFx = attach({ effect: xcmModel.effects.fetchConfigFx });

forward({
  from: xcmConfigRequested,
  to: [getConfigFx, fetchConfigFx],
});

sample({
  clock: formOpened,
  fn: ({ asset }) => asset,
  target: $asset,
});

sample({
  clock: formOpened,
  fn: ({ chain }) => chain,
  target: $originChain,
});

sample({
  clock: formOpened,
  source: $finalConfig,
  filter: (config: XcmConfig | null): config is XcmConfig => Boolean(config),
  fn: (config, { chain, asset }) => getAvailableDirections(config.chains, asset.assetId, chain.chainId),
  target: $destinations,
});

forward({
  from: destinationChainSelected,
  to: $destinationChain,
});

sample({
  clock: getConfigFx.doneData,
  filter: (config): config is XcmConfig => Boolean(config),
  target: calculateFinalConfigFx,
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
  formOpened,
  destinationChainSelected,
};
