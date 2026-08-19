import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Label } from '@/shared/ui-kit';
import { type UnbondingChunk } from '@/domains/staking';
import { getCountdownParts, getUnbondingCountdown } from '@/features/dashboard-staking-positions';
import { formatAssetAmount } from '../lib/amounts';

type Props = {
  chunks: UnbondingChunk[];
  redeemable: string;
  symbol: string;
  precision: number;
};

/**
 * One chip per unlocking chunk — amber while it is still locked, green once it
 * can be withdrawn. The countdown comes from the era anchor; without one, and
 * once the estimate has been overtaken, the chip falls back to the era count,
 * which is all the chain can tell us.
 *
 * The maths is the positions drawer's, not a copy of it: the same chunk showed
 * `0d 0h` here and a real countdown there, because this file rounded to two
 * units of its own.
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
        const countdown = getUnbondingCountdown(chunk.unlockEstimateMs, now);
        const parts = countdown && !countdown.elapsed ? getCountdownParts(countdown) : null;

        return (
          <Label key={`${chunk.era}-${chunk.value}`} variant="orange">
            {parts
              ? t('dashboard.staking.kpi.positions.unbondingChip', {
                  amount,
                  duration: t(`time.compact.${parts.unit}`, { ...parts }),
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
