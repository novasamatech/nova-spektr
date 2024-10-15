import { attach, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import { type NavigateFunction } from 'react-router-dom';

import { chainsService } from '@/shared/api/network';
import { type Asset, type Chain, type ChainId } from '@/shared/core';

const validateUrlParams = createEvent<URLSearchParams>();
const storeCleared = createEvent();

export const $chain = createStore<Chain | null>(null).reset(storeCleared);
export const $asset = createStore<Asset | null>(null).reset(storeCleared);

type Navigation = {
  redirectPath: string;
  navigate: NavigateFunction;
};
const $navigation = createStore<Navigation | null>(null).reset(storeCleared);
const navigationApi = createApi($navigation, {
  navigateApiChanged: (state, { navigate, redirectPath }) => ({ ...state, navigate, redirectPath }),
});

type ValidateParams = {
  chainId: string | null;
  assetId: string | null;
};
const getChainAndAssetFx = createEffect(({ chainId, assetId }: ValidateParams) => {
  if (!chainId || !assetId) return undefined;

  const chain = chainsService.getChainById(chainId as ChainId);
  const asset = chain?.assets.find((a) => a.assetId === Number(assetId));

  return { chain, asset };
});

sample({
  clock: validateUrlParams,
  fn: (urlParams) => ({
    chainId: urlParams.get('chainId'),
    assetId: urlParams.get('assetId'),
  }),
  target: getChainAndAssetFx,
});

sample({
  clock: getChainAndAssetFx.doneData,
  fn: (data) => data?.chain || null,
  target: $chain,
});

sample({
  clock: getChainAndAssetFx.doneData,
  fn: (data) => data?.asset || null,
  target: $asset,
});

sample({
  clock: getChainAndAssetFx.doneData,
  filter: (data) => !data?.chain || !data?.asset,
  target: attach({
    source: $navigation,
    effect: (state) => state?.navigate(state?.redirectPath, { replace: true }),
  }),
});

export const events = {
  navigateApiChanged: navigationApi.navigateApiChanged,
  validateUrlParams,
  storeCleared,
};
