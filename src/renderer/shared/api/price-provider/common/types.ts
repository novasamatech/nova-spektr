export type Currency = string;
export type AssetId = string;

export type PriceItem = {
  price: number;
  change: number;
};
export type AssetPrice = Record<Currency, PriceItem>;
export type PriceObject = Record<AssetId, AssetPrice>;
export type PriceRange = [number, string];
export type PriceDB = {
  assetId: AssetId;
  currency: Currency;
  price: number;
  change: number;
};

export type PriceAdapter = {
  getPrice: (ids: AssetId[], currencies: Currency[], includeRateChange: boolean) => Promise<PriceObject>;
  getHistoryData: (id: AssetId, currency: Currency, from: number, to: number) => Promise<PriceRange[]>;
};

export type CurrencyItem = {
  id: number;
  code: string;
  name: string;
  symbol?: string;
  category: 'fiat' | 'crypto';
  popular: boolean;
  coingeckoId: string;
};
