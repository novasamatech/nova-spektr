import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, HelpText } from '@/shared/ui';
import { AssetFiatBalance } from '@/widgets/price';
import { type MinStakeRow } from '../hooks/useMinStakeRows';
import { TOOLTIP_WIDTH } from '../lib/constants';
import { formatExactTokens, formatSignedTokens } from '../lib/format';

type Props = {
  row: MinStakeRow;
  /** The era drawn before this one, for the per-era change line. */
  previous: MinStakeRow | undefined;
  asset: Asset;
  /** Global fiat display flag — fiat appears nowhere else on this widget. */
  showFiat: boolean;
  formatDate: (date: Date | number, pattern: string) => string;
};

/**
 * The hover card is the drill-down half of the abbreviation rule: the plot
 * shows `1,160.2K`, the card prints `1,160,234` in full. The change against the
 * previous era lives here rather than on the plot, so the plot stays one number
 * per era.
 */
export const MinStakeTooltip = ({ row, previous, asset, showFiat, formatDate }: Props) => {
  const { t } = useI18n();

  const date = row.dateMs === null ? null : formatDate(row.dateMs, 'MMM d');
  const title = [
    t('dashboard.staking.minStake.tooltip.era', { era: row.era.toLocaleString('en-US') }),
    date,
    row.isActive ? t('dashboard.staking.minStake.tooltip.active') : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');

  return (
    <div
      className="pointer-events-none rounded-lg border border-token-container-border bg-white p-3 shadow-card-shadow"
      style={{ width: TOOLTIP_WIDTH }}
    >
      <HelpText className="text-text-tertiary">{title}</HelpText>

      <div className="mt-2 flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <FootnoteText className="text-text-secondary">
            {t('dashboard.staking.minStake.tooltip.threshold')}
          </FootnoteText>
          <FootnoteText className="font-semibold tabular-nums">
            {formatExactTokens(row.tokens)} {asset.symbol}
          </FootnoteText>
        </div>

        {showFiat && (
          <div className="flex items-baseline justify-end">
            <AssetFiatBalance asset={asset} amount={row.minStake} />
          </div>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <FootnoteText className="text-text-secondary">
            {previous
              ? t('dashboard.staking.minStake.tooltip.vsEra', { era: previous.era.toLocaleString('en-US') })
              : t('dashboard.staking.minStake.tooltip.vsPreviousEra')}
          </FootnoteText>
          <FootnoteText className="text-text-secondary tabular-nums">
            {previous ? `${formatSignedTokens(row.tokens - previous.tokens)} ${asset.symbol}` : '—'}
          </FootnoteText>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <FootnoteText className="text-text-secondary">
            {t('dashboard.staking.minStake.tooltip.validators')}
          </FootnoteText>
          <FootnoteText className="text-text-secondary tabular-nums">{row.validatorCount}</FootnoteText>
        </div>
      </div>
    </div>
  );
};
