import { type BN } from '@polkadot/util';

import { type Asset, type AssetByChains } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type FormatBalanceConfig, cnTw, formatBalance } from '@/shared/lib/utils';

type Props = {
  value?: BN | string;
  asset?: Asset | AssetByChains;
  className?: string;
  showSymbol?: boolean;
  keepPrecision?: boolean;
  /**
   * Which magnitudes collapse to a suffix. Defaults to the app's own rule —
   * millions and up — so a caller only passes this to opt into `K`, which a
   * dense surface (a card, a table row) needs and a form does not.
   */
  shorthands?: FormatBalanceConfig['shorthands'];
  /**
   * Hard cap on decimals, for surfaces where a number has to fit a column
   * rather than be exact. Without it a sub-unit amount is shown to as many
   * places as it takes to reveal a digit — `0.000002` — which is honest and
   * unreadably wide.
   *
   * An amount too small for the cap does not round to a lying `0.0000`: it
   * renders as `<0.0001`, the smallest value the cap can express.
   */
  maxDecimals?: number;
  testId?: string;
};

export const AssetBalance = ({
  value,
  asset,
  className,
  showSymbol = true,
  keepPrecision = false,
  shorthands,
  maxDecimals,
  testId = 'AssetBalance',
}: Props) => {
  const { t } = useI18n();

  if (!asset) {
    return null;
  }

  const { precision, symbol } = asset;
  const {
    value: formattedValue,
    decimalPlaces,
    suffix,
  } = formatBalance(value, precision, {
    keepPrecision,
    shorthands,
  });

  const digits = maxDecimals === undefined ? decimalPlaces : Math.min(decimalPlaces, maxDecimals);
  const threshold = maxDecimals === undefined ? 0 : 10 ** -maxDecimals;
  // Read "is there anything here at all" off the raw planck, not off the
  // formatted string: `formatBalance` has already rounded 0.000002 down to `0`,
  // so the formatted value cannot tell a dust amount from an empty balance.
  const hasAmount = value !== undefined && /[1-9]/.test(value.toString());
  const belowThreshold = hasAmount && Number(formattedValue) < threshold;

  const balanceValue = belowThreshold
    ? t('assetBalance.lessThan', {
        value: t('assetBalance.number', { value: threshold, maximumFractionDigits: digits }),
      })
    : t('assetBalance.number', {
        value: formattedValue,
        maximumFractionDigits: digits,
      });

  return (
    <span className={cnTw('shrink-0 text-body text-text-primary', className)} data-testid={testId}>
      {balanceValue}
      {suffix} {showSymbol && symbol}
    </span>
  );
};
