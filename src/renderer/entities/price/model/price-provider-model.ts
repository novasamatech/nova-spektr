import { createEvent, createStore, createEffect, sample } from 'effector';

import { PriceApiProvider } from '../lib/types';
import { DEFAULT_FIAT_PROVIDER, DEFAULT_ASSETS_PRICES, DEFAULT_FIAT_FLAG } from '../lib/constants';
import { fiatService, coingekoService, PriceObject, PriceAdapter } from '@shared/api/price-provider';
import { kernelModel } from '@shared/core';
import { chainsService } from '@shared/api/network';
import { nonNullable } from '@shared/lib/utils';
import { currencyModel } from './currency-model';

const $fiatFlag = createStore<boolean | null>(null);
const $priceProvider = createStore<PriceApiProvider | null>(null);
const $assetsPrices = createStore<PriceObject | null>(null);

const fiatFlagChanged = createEvent<boolean>();
const priceProviderChanged = createEvent<PriceApiProvider>();
const assetsPricesRequested = createEvent<{ includeRates: boolean }>();

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
  provider: PriceApiProvider;
  currencies: string[];
  includeRates: boolean;
};
const fetchAssetsPricesFx = createEffect<FetchPrices, PriceObject>(({ provider, currencies, includeRates }) => {
  const ProvidersMap: Record<PriceApiProvider, PriceAdapter> = {
    [PriceApiProvider.COINGEKO]: coingekoService,
  };

  const priceIds = chainsService.getChainsData().reduce<string[]>((acc, chain) => {
    const ids = chain.assets.map((asset) => asset.priceId).filter(nonNullable);
    acc.push(...ids);

    return acc;
  }, []);

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
  clock: [assetsPricesRequested, $priceProvider, currencyModel.$activeCurrency],
  source: { provider: $priceProvider, currency: currencyModel.$activeCurrency },
  filter: ({ provider, currency }) => provider !== null && currency !== null,
  fn: ({ provider, currency }) => {
    return { provider: provider!, currencies: [currency!.coingeckoId], includeRates: true };
  },
  target: fetchAssetsPricesFx,
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
    assetsPricesRequested,
  },
  output: {
    fiatFlagChangedDone: saveFiatFlagFx.done,
    fiatFlagChangedFail: saveFiatFlagFx.fail,
    fiatFlagLoaded: getFiatFlagFx.done,
  },
};
