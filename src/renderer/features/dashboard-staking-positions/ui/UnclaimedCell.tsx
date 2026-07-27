import { BN } from '@polkadot/util';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Skeleton, Tooltip } from '@/shared/ui-kit';
import { useUnclaimedRewards } from '../hooks/useUnclaimedRewards';
import { type ExpiryUrgency, type PositionRow } from '../lib';

type Props = {
  row: PositionRow;
};

const URGENCY_CLASS: Record<ExpiryUrgency, string> = {
  critical: 'bg-badge-red-background-default text-text-negative',
  warning: 'bg-badge-orange-background-default text-text-warning',
  safe: 'bg-badge-green-background-default text-text-positive',
};

/**
 * Unclaimed rewards and how long they have left.
 *
 * The chip is the point of the column: a payout is not merely "not collected
 * yet", it is destroyed once its era leaves the runtime history, and the only
 * useful thing to show next to the amount is how close that is.
 */
export const UnclaimedCell = ({ row }: Props) => {
  const { t } = useI18n();
  const { total, expiryDays, urgency, pending } = useUnclaimedRewards(row.chain, row.accountId);

  if (pending) {
    return <Skeleton width="72px" height="16px" />;
  }

  if (new BN(total).isZero()) {
    return <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>;
  }

  return (
    <div className="flex items-center gap-x-2">
      <AssetBalance value={total} asset={row.asset} className="text-footnote" />

      {urgency && expiryDays !== null ? (
        <Tooltip>
          <Tooltip.Trigger>
            <div className={cnTw('flex h-4.5 shrink-0 items-center rounded-full px-1.5', URGENCY_CLASS[urgency])}>
              <CaptionText className="text-inherit">
                {expiryDays < 1
                  ? t('dashboard.staking.positions.expiry.expiring')
                  : t('dashboard.staking.positions.expiry.days', { days: Math.floor(expiryDays) })}
              </CaptionText>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('dashboard.staking.positions.expiry.hint')}</Tooltip.Content>
        </Tooltip>
      ) : null}
    </div>
  );
};
