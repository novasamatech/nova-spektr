import { localStorageService } from '@renderer/shared/api/local-storage';
import { CurrencyConfig } from '../common/types';
import {
  CURRENCY_URL,
  CURRENCY_CONFIG_KEY,
  CURRENCY_CODE_KEY,
  FIAT_FLAG_KEY,
  FIAT_PROVIDER,
  ASSETS_PRICES,
} from '../common/constants';

export const fiatService = {
  fetchCurrencyConfig,
  getCurrencyConfig,
  saveCurrencyConfig,
  getActiveCurrencyCode,
  saveActiveCurrencyCode,
  getFiatFlag,
  saveFiatFlag,
  getFiatProvider,
  saveFiatProvider,
  getAssetsPrices,
  saveAssetsPrices,
};

async function fetchCurrencyConfig(): Promise<CurrencyConfig[]> {
  const response = await fetch(CURRENCY_URL, { cache: 'default' });

  return response.json();
}

function getCurrencyConfig(defaultConfig: CurrencyConfig[]): CurrencyConfig[] {
  return localStorageService.getFromStorage<CurrencyConfig[]>(CURRENCY_CONFIG_KEY, defaultConfig);
}

function saveCurrencyConfig(config: CurrencyConfig[]) {
  localStorageService.saveToStorage(CURRENCY_CONFIG_KEY, config);
}

function getActiveCurrencyCode(defaultCode: string): string {
  return localStorageService.getFromStorage(CURRENCY_CODE_KEY, defaultCode.toLowerCase());
}

function saveActiveCurrencyCode(code: string) {
  console.log(code);
  localStorageService.saveToStorage(CURRENCY_CODE_KEY, code.toLowerCase());
}

function getFiatFlag(defaultFlag: boolean): boolean {
  return localStorageService.getFromStorage(FIAT_FLAG_KEY, defaultFlag);
}

function saveFiatFlag(flag: boolean) {
  localStorageService.saveToStorage(FIAT_FLAG_KEY, flag);
}

function getFiatProvider<T extends any>(defaultFiatProvider: T): T {
  return localStorageService.getFromStorage(FIAT_PROVIDER, defaultFiatProvider);
}

function saveFiatProvider(provider: string) {
  localStorageService.saveToStorage(FIAT_PROVIDER, provider);
}

function getAssetsPrices<T extends any>(defaultPrices: T): T {
  return localStorageService.getFromStorage(ASSETS_PRICES, defaultPrices);
}

function saveAssetsPrices<T extends any>(prices: T) {
  localStorageService.saveToStorage(ASSETS_PRICES, prices);
}
