import { formatFiatBalance } from '@/shared/lib/utils';
import { type CurrencyItem } from '@/domains/price';

/**
 * Formats a fiat amount with the active currency symbol/code, matching the
 * `Price` component output — for use inside translation strings. `null` (amount
 * can't be priced) renders as an em dash.
 */
export function formatFiat(amount: string | null, currency: CurrencyItem | null): string {
  if (amount === null) return '—';

  const { formatted } = formatFiatBalance(amount);

  return currency?.symbol ? `${currency.symbol}${formatted}` : `${formatted} ${currency?.code ?? ''}`.trim();
}
