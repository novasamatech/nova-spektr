export type Currency = string;
export type AssetId = string;

export type PriceItem = {
  price: number;
  change: number;
};
export type AssetPrice = Record<Currency, PriceItem>;
export type PriceObject = Record<AssetId, AssetPrice>;
export type PriceRange = [number, string];

export type CurrencyItem = {
  id: number;
  code: string;
  name: string;
  symbol?: string;
  category: 'fiat' | 'crypto';
  popular: boolean;
  coingeckoId: string;
};
