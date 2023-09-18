# Fiat price

Now fiat price feature consists of `PriceAdapter` type. Each adapter should implement two functions 1. to return price for selected crypto assets with selected currencies (fiat or crypto) and 2. return history data for selected asset, currency and time range. 

```typescript
  getPrice: (ids: AssetId[], currencies: Currency[], includeRateChange: boolean) => Promise<PriceObject>;
  getHistoryData: (id: AssetId, currency: Currency, from: number, to: number) => Promise<PriceRange[]>;
```

And we have two util functions, which can convert `PriceObject` format to `PriceDB` format.

`PriceObject` is based on coingecko format.
`PriceDB` is based on IndexedDB storage object.

```typescript
type PriceObject = Record<AssetId, AssetPrice>;
type AssetPrice = Record<Currency, PriceItem>;
type PriceItem = {
  price: number;
  change: number;
};
```

example 

```typescript
const priceObject = {
  polkadot: {
    usd: {
      price: 4.1
      change: -0.1
    }
  }
}
```

```typescript
type PriceDB = {
  assetId: AssetId;
  currency: Currency;
  price: number;
  change: number;
};
```

example 

```typescript
const priceArray = [{
  assetId: 'polkadot',
  currency: 'usd',
  price: 4.1,
  change: -0.1
}]
```
