import { createEvent, createStore, forward, createEffect, sample } from 'effector';

import { PriceApiProvider } from '../lib/types';
import { DEFAULT_FIAT_PROVIDER, DEFAULT_ASSETS_PRICES, DEFAULT_FIAT_FLAG } from '../lib/constants';
import { fiatService, coingekoService, PriceObject, PriceAdapter } from '@renderer/shared/api/price-provider';
import { kernelModel } from '@renderer/shared/core';
import * as currencyModel from './currency-model';
import { chainsService } from '@renderer/entities/network';
import { nonNullable } from '@renderer/shared/lib/utils';

export const $fiatFlag = createStore<boolean | null>(null);
export const $priceProvider = createStore<PriceApiProvider | null>(null);
export const $assetsPrices = createStore<PriceObject | null>(null);

const fiatFlagChanged = createEvent<boolean>();
const priceProviderChanged = createEvent<PriceApiProvider>();
const assetsPricesRequested = createEvent<boolean>();

const getFiatFlagFx = createEffect((): boolean => {
  return fiatService.getFiatFlag(DEFAULT_FIAT_FLAG);
});

const saveFiatFlagFx = createEffect((flag: boolean) => {
  fiatService.saveFiatFlag(flag);
});

const getPriceProviderFx = createEffect((): PriceApiProvider => {
  return fiatService.getFiatProvider(DEFAULT_FIAT_PROVIDER);
});

const savePriceProviderFx = createEffect((provider: string) => {
  fiatService.saveFiatProvider(provider);
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

const saveAssetsPricesFx = createEffect((prices: PriceObject) => {
  fiatService.saveAssetsPrices(prices);
});

forward({
  from: kernelModel.events.appStarted,
  to: [getFiatFlagFx, getPriceProviderFx, getAssetsPricesFx],
});

forward({ from: getFiatFlagFx.doneData, to: $fiatFlag });

forward({ from: getPriceProviderFx.doneData, to: $priceProvider });

forward({ from: getAssetsPricesFx.doneData, to: $assetsPrices });

sample({
  clock: [$priceProvider, currencyModel.$activeCurrency],
  source: { provider: $priceProvider, currency: currencyModel.$activeCurrency },
  filter: ({ provider, currency }) => provider !== null && currency !== null,
  fn: ({ provider, currency }) => {
    return { provider: provider!, currencies: [currency!.coingeckoId], includeRates: true };
  },
  target: fetchAssetsPricesFx,
});

forward({ from: fiatFlagChanged, to: [$fiatFlag, saveFiatFlagFx] });

forward({ from: priceProviderChanged, to: [$priceProvider, savePriceProviderFx] });

forward({ from: fetchAssetsPricesFx.doneData, to: [$assetsPrices, saveAssetsPricesFx] });

sample({
  clock: assetsPricesRequested,
  source: $priceProvider,
  target: [$priceProvider, saveAssetsPricesFx],
});

export const events = {
  fiatFlagChanged,
  priceProviderChanged,
  assetsPricesRequested,
};
