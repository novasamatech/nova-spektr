// Service
export { coingeckoService } from './service/coingeckoService';

// Models
export { priceProviderModel } from './model/price-provider-model';
export { currencyModel } from './model/currency-model';

// Current Prices
export { currentPricesResource } from './current-prices/resource';
export type { CurrentPricesParams } from './current-prices/resource';
export { useAssetsPrices } from './current-prices/hooks';

// Price History
export { priceHistoryResource } from './price-history/resource';
export { usePriceHistory } from './price-history/hooks';

// Types
export type { CurrencyItem, PriceObject, PriceRange } from './lib/types';
export { PriceApiProvider } from './lib/types';
export type { PriceHistoryParams, TimeRange as PriceHistoryTimeRange } from './price-history/resource';

// Utils
export { getCurrencyChangeKey } from './lib/utils';
