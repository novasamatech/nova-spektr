import { createEffect, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { type Chain } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import {
  ASSETS_PRICES_KEY,
  DEFAULT_ASSETS_PRICES,
  DEFAULT_FIAT_FLAG,
  DEFAULT_FIAT_PROVIDER,
  FIAT_FLAG_KEY,
  PRICE_PROVIDER_KEY,
} from '../lib/constants';
import { type PriceAdapter, type PriceObject, PriceApiProvider } from '../lib/types';
import { coingeckoService } from '../service/coingeckoService';

import { currencyModel } from './currency-model';

const $fiatFlag = createStore<boolean>(DEFAULT_FIAT_FLAG);
const $priceProvider = createStore<PriceApiProvider>(DEFAULT_FIAT_PROVIDER);
const $assetsPrices = createStore<PriceObject>(DEFAULT_ASSETS_PRICES);

persist({ key: FIAT_FLAG_KEY, store: $fiatFlag, sync: true });
persist({ key: PRICE_PROVIDER_KEY, store: $priceProvider, sync: true });
persist({ key: ASSETS_PRICES_KEY, store: $assetsPrices, sync: true });

const fiatFlagChanged = createEvent<boolean>();
const priceProviderChanged = createEvent<PriceApiProvider>();

type FetchPrices = {
  chains: Chain[];
  provider: PriceApiProvider;
  currencies: string[];
  includeRates: boolean;
};
const fetchAssetsPricesFx = createEffect<FetchPrices, PriceObject>(({ chains, provider, currencies, includeRates }) => {
  const ProvidersMap: Record<PriceApiProvider, PriceAdapter> = {
    [PriceApiProvider.COINGEKO]: coingeckoService,
  };

  const priceIds = chains.flatMap(chain => chain.assets.map(asset => asset.priceId).filter(nonNullable));

  return ProvidersMap[provider].getPrice(priceIds, currencies, includeRates);
});

sample({
  source: { chains: networkModel.$chains, provider: $priceProvider, currency: currencyModel.$activeCurrency },
  filter: ({ chains, provider, currency }) =>
    !!Object.values(chains).length && nonNullable(provider) && nonNullable(currency),
  fn: ({ chains, provider, currency }) => {
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
  clock: fiatFlagChanged,
  target: $fiatFlag,
});

sample({
  clock: priceProviderChanged,
  target: $priceProvider,
});

sample({
  clock: fetchAssetsPricesFx.doneData,
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
    fiatFlagChangedDone: fiatFlagChanged,
    fiatFlagChangedFail: fiatFlagChanged,
  },
};
