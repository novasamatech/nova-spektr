import { useI18n } from '@/shared/i18n';
import { type LabelVariant, Label, Tooltip } from '@/shared/ui-kit';
import { type PositionStatus, type PositionStatusReason } from '@/domains/staking';

type Props = {
  status: PositionStatus;
  statusReason: PositionStatusReason;
};

const VARIANT: Record<PositionStatus, LabelVariant> = {
  active: 'green',
  waiting: 'orange',
  inactive: 'red',
  bonded: 'gray',
};

/**
 * The pill and the sentence behind it.
 *
 * The reason is what makes the pill actionable — "Inactive" alone tells the
 * user nothing they can do about it, while "every validator is oversubscribed"
 * points straight at changing validators. When the chain has not told us why,
 * the tooltip falls back to the plain status meaning rather than inventing
 * one.
 */
export const PositionStatusPill = ({ status, statusReason }: Props) => {
  const { t } = useI18n();

  const hint = statusReason
    ? t(`dashboard.staking.positions.statusHint.${statusReason}`)
    : t(`dashboard.staking.positions.statusHint.${status}`);

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div className="w-fit">
          <Label variant={VARIANT[status]}>{t(`dashboard.staking.positions.status.${status}`)}</Label>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{hint}</Tooltip.Content>
    </Tooltip>
  );
};
