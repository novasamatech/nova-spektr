import { createEffect, createEvent, createStore, sample } from 'effector';

import { type PriceAdapter, type PriceObject, coingekoService, fiatService } from '@/shared/api/price-provider';
import { type Chain, type ChainId, kernelModel } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { DEFAULT_ASSETS_PRICES, DEFAULT_FIAT_FLAG, DEFAULT_FIAT_PROVIDER } from '../lib/constants';
import { PriceApiProvider } from '../lib/types';

import { currencyModel } from './currency-model';

const $fiatFlag = createStore<boolean | null>(null);
const $priceProvider = createStore<PriceApiProvider | null>(null);
const $assetsPrices = createStore<PriceObject | null>(null);

const fiatFlagChanged = createEvent<boolean>();
const priceProviderChanged = createEvent<PriceApiProvider>();

const getFiatFlagFx = createEffect((): boolean => {
  return fiatService.getFiatFlag(DEFAULT_FIAT_FLAG);
});

const saveFiatFlagFx = createEffect((flag: boolean): boolean => {
  return fiatService.saveFiatFlag(flag);
});

const getPriceProviderFx = createEffect((): PriceApiProvider => {
  return fiatService.getPriceProvider(DEFAULT_FIAT_PROVIDER);
});

const savePriceProviderFx = createEffect((provider: PriceApiProvider): PriceApiProvider => {
  return fiatService.savePriceProvider(provider);
});

type FetchPrices = {
  chains: Chain[];
  provider: PriceApiProvider;
  currencies: string[];
  includeRates: boolean;
};
const fetchAssetsPricesFx = createEffect<FetchPrices, PriceObject>(({ chains, provider, currencies, includeRates }) => {
  const ProvidersMap: Record<PriceApiProvider, PriceAdapter> = {
    [PriceApiProvider.COINGEKO]: coingekoService,
  };

  const priceIds = chains.flatMap((chain) => chain.assets.map((asset) => asset.priceId).filter(nonNullable));

  return ProvidersMap[provider].getPrice(priceIds, currencies, includeRates);
});

const getAssetsPricesFx = createEffect((): PriceObject => {
  return fiatService.getAssetsPrices(DEFAULT_ASSETS_PRICES);
});

const saveAssetsPricesFx = createEffect((prices: PriceObject): PriceObject => {
  return fiatService.saveAssetsPrices(prices);
});

sample({
  clock: kernelModel.events.appStarted,
  target: [getFiatFlagFx, getPriceProviderFx, getAssetsPricesFx],
});

sample({
  clock: currencyModel.$activeCurrency,
  source: { chains: networkModel.$chains, provider: $priceProvider },
  filter: (source: { chains: Record<ChainId, Chain>; provider: PriceApiProvider | null }, currency) => {
    const { provider } = source;
    return provider !== null && currency !== null;
  },
  fn: ({ chains, provider }, currency) => {
    return {
      chains: Object.values(chains),
      provider: provider!,
      currencies: [currency!.coingeckoId],
      includeRates: true,
    };
  },
  target: fetchAssetsPricesFx,
});

sample({
  clock: getFiatFlagFx.doneData,
  target: $fiatFlag,
});

sample({
  clock: getPriceProviderFx.doneData,
  target: $priceProvider,
});

sample({
  clock: getAssetsPricesFx.doneData,
  target: $assetsPrices,
});

sample({
  clock: fiatFlagChanged,
  target: saveFiatFlagFx,
});
sample({
  clock: saveFiatFlagFx.doneData,
  target: $fiatFlag,
});

sample({
  clock: priceProviderChanged,
  target: savePriceProviderFx,
});
sample({
  clock: savePriceProviderFx.doneData,
  target: $priceProvider,
});

sample({
  clock: fetchAssetsPricesFx.doneData,
  target: saveAssetsPricesFx,
});
sample({
  clock: saveAssetsPricesFx.doneData,
  target: $assetsPrices,
});

export const priceProviderModel = {
  $fiatFlag,
  $priceProvider,
  $assetsPrices,
  events: {
    fiatFlagChanged,
    priceProviderChanged,
  },
  output: {
    fiatFlagChangedDone: saveFiatFlagFx.done,
    fiatFlagChangedFail: saveFiatFlagFx.fail,
    fiatFlagLoaded: getFiatFlagFx.done,
  },
};
