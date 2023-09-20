export {};

// import { createEvent, createStore, forward, createEffect, sample } from 'effector';
//
// import { PriceApiProvider } from '../lib/types';
// import { DEFAULT_SHOW_FIAT, DEFAULT_FIAT_PROVIDER, DEFAULT_ASSETS_PRICES } from '../lib/constants';
// import { fiatService, PriceObject } from '@renderer/shared/api/price-provider';
// import * as currencyModel from './currency-model';
//
// const appStarted = createEvent();
//
// export const $fiatFlag = createStore<boolean>(false);
// export const $priceProvider = createStore<PriceApiProvider | null>(null);
// export const $chainsPrices = createStore<any[]>([]);
//
// const fiatFlagChanged = createEvent<boolean>();
// const priceProviderChanged = createEvent<PriceApiProvider>();
// const chainsPricesRequested = createEvent<boolean>();
//
// const getFiatFlagFx = createEffect((): boolean => {
//   return fiatService.getFiatFlag(DEFAULT_SHOW_FIAT);
// });
//
// const saveFiatFlagFx = createEffect((flag: boolean) => {
//   fiatService.saveFiatFlag(flag);
// });
//
// const getPriceProviderFx = createEffect((): string => {
//   return fiatService.getFiatProvider(DEFAULT_FIAT_PROVIDER);
// });
//
// const savePriceProviderFx = createEffect((provider: string) => {
//   fiatService.saveFiatProvider(provider);
// });
//
// type FetchPrices = {
//   provider: PriceApiProvider;
//   currency: string;
//   includeRates: boolean;
// };
// const fetchChainsPricesFx = createEffect<FetchPrices, Promise<PriceObject>>(
//   async ({ provider, currency, includeRates }) => {
//     // const ProvidersMap: Record<PriceApiProvider, PriceAdapter> = {
//     //   [PriceApiProvider.COINGEKO]: coingekoService,
//     // };
//     //
//     // // const chains = chains
//     //
//     // return ProvidersMap[provider].getPrice();
//   },
// );
//
// const getChainsPricesFx = createEffect(() => {
//   fiatService.getAssetsPrices(DEFAULT_ASSETS_PRICES);
// });
//
// const saveChainsPricesFx = createEffect((prices: any[]) => {
//   fiatService.saveAssetsPrices(prices);
// });
//
// forward({ from: appStarted, to: [getFiatFlagFx, getPriceProviderFx] });
//
// sample({
//   clock: currencyModel.$activeCurrency,
//   source: $priceProvider,
//   fn: (provider, currency) => ({ provider }),
//   target: fetchChainsPricesFx,
// });
//
// forward({ from: fiatFlagChanged, to: [$fiatFlag, saveFiatFlagFx] });
//
// forward({ from: priceProviderChanged, to: [$priceProvider, savePriceProviderFx] });
//
// sample({
//   clock: chainsPricesRequested,
//   source: $priceProvider,
//   target: [$priceProvider, savePriceProviderFx],
// });
//
// export const events = {
//   appStarted,
//   showFiatChanged: fiatFlagChanged,
// };
