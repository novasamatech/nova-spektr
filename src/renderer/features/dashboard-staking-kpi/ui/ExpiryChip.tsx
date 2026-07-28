import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Label, Tooltip } from '@/shared/ui-kit';
import { DEFAULT_CLAIM_WINDOW_ERAS, EXPIRY_LABEL_VARIANT, getExpiryUrgency } from '../lib/expiry';

type Props = {
  daysLeft: number;
  /** Runtime `HistoryDepth` of the chain the payout belongs to. */
  historyDepth?: number | null;
};

/**
 * How long the oldest unclaimed payout has left. Colour carries the urgency,
 * the tooltip explains the rule behind it — most users have never heard of the
 * claim window until a reward silently expires.
 */
export const ExpiryChip = memo(({ daysLeft, historyDepth }: Props) => {
  const { t } = useI18n();
  const urgency = getExpiryUrgency(daysLeft);

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div>
          <Label variant={EXPIRY_LABEL_VARIANT[urgency]}>
            {t('dashboard.staking.kpi.rewards.expiresIn', { count: daysLeft })}
          </Label>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        {t('dashboard.staking.kpi.rewards.claimWindowHint', { eras: historyDepth ?? DEFAULT_CLAIM_WINDOW_ERAS })}
      </Tooltip.Content>
    </Tooltip>
  );
});
