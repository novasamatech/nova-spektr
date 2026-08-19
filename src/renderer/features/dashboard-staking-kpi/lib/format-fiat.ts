import { formatFiatBalance } from '@/shared/lib/utils';
import { type CurrencyItem } from '@/domains/price';

/**
 * A fiat amount with the active currency marker, for use inside translated
 * strings and headline figures. `null` (nothing priceable) renders as an em
 * dash rather than a misleading `$0`.
 */
export function formatFiat(amount: string | null, currency: CurrencyItem | null): string {
  if (amount === null) return '—';

  const { formatted } = formatFiatBalance(amount);

  return currency?.symbol ? `${currency.symbol}${formatted}` : `${formatted} ${currency?.code ?? ''}`.trim();
}
