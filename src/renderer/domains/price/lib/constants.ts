import { PriceApiProvider } from './types';

export const COINGECKO_URL = 'https://tokens-price.novasama-tech.org/api/v3';
export const CURRENCY_CODE_KEY = 'currency_code';
export const FIAT_FLAG_KEY = 'fiat_flag';
export const PRICE_PROVIDER_KEY = 'price_provider';
export const DEFAULT_FIAT_FLAG = true;
export const DEFAULT_CURRENCY_CODE = 'usd';
export const DEFAULT_FIAT_PROVIDER = PriceApiProvider.COINGEKO;
