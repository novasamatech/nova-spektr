import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Tooltip } from '@/shared/ui-kit';

export const PriceChangeIndicator = ({ change }: { change: number | null }) => {
  const { t } = useI18n();

  if (change === null || change === 0 || !Number.isFinite(change)) return null;

  const isPositive = change > 0;

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <span className={cnTw('text-footnote tabular-nums', isPositive ? 'text-text-positive' : 'text-text-negative')}>
          {isPositive ? '↑' : '↓'}
          {Math.abs(change).toFixed(2)}%
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('dashboard.portfolioOverview.priceChange24h')}</Tooltip.Content>
    </Tooltip>
  );
};
