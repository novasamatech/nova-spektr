import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Label } from '@/shared/ui-kit';
import { type UnbondingChunk } from '@/domains/staking';
import { formatAssetAmount } from '../lib/amounts';

type Props = {
  chunks: UnbondingChunk[];
  redeemable: string;
  symbol: string;
  precision: number;
};

function formatCountdown(chunk: UnbondingChunk, now: number): { days: number; hours: number } | null {
  if (chunk.unlockEstimateMs === null) return null;

  const remaining = Math.max(0, chunk.unlockEstimateMs - now);

  return {
    days: Math.floor(remaining / (24 * 60 * 60 * 1000)),
    hours: Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
  };
}

/**
 * One chip per unlocking chunk — amber while it is still locked, green once it
 * can be withdrawn. The countdown comes from the era anchor; without one the
 * chip falls back to the era count, which is all the chain can tell us.
 */
export const UnbondingChips = memo(({ chunks, redeemable, symbol, precision }: Props) => {
  const { t } = useI18n();
  const now = Date.now();
  const hasRedeemable = Number(redeemable) > 0;

  if (chunks.length === 0 && !hasRedeemable) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {hasRedeemable && (
        <Label variant="green">
          {t('dashboard.staking.kpi.positions.readyChip', {
            amount: formatAssetAmount({ symbol, precision, amount: redeemable }),
          })}
        </Label>
      )}
      {chunks.map((chunk) => {
        const amount = formatAssetAmount({ symbol, precision, amount: chunk.value });
        const countdown = formatCountdown(chunk, now);

        return (
          <Label key={`${chunk.era}-${chunk.value}`} variant="orange">
            {countdown
              ? t('dashboard.staking.kpi.positions.unbondingChip', {
                  amount,
                  days: countdown.days,
                  hours: countdown.hours,
                })
              : t('dashboard.staking.kpi.positions.unbondingErasChip', {
                  amount,
                  count: chunk.erasLeft,
                })}
          </Label>
        );
      })}
    </div>
  );
});
