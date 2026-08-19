import { useI18n } from '@/shared/i18n';
import { type LabelVariant, Label, Skeleton, Tooltip } from '@/shared/ui-kit';
import { type PositionKind, type PositionStatus, type PositionStatusReason } from '@/domains/staking';

type Props = {
  status: PositionStatus;
  statusReason: PositionStatusReason;
  kind?: PositionKind;
};

const VARIANT: Record<Exclude<PositionStatus, 'unknown'>, LabelVariant> = {
  active: 'green',
  waiting: 'orange',
  inactive: 'red',
  bonded: 'gray',
};

/**
 * The pill and the sentence behind it.
 *
 * The reason is what makes the pill actionable — "Inactive" alone tells the
 * user nothing they can do about it, while "none of the nominated validators
 * was elected" points straight at changing validators. When the chain has not
 * told us why, the tooltip falls back to the plain status meaning rather than
 * inventing one.
 *
 * `unknown` gets no pill at all: it is the exposure read still being in flight,
 * and every pill this component can draw would be a claim about the chain that
 * nobody has checked. The cell shimmers alongside the KPI cards above it, which
 * are waiting on the same data.
 */
export const PositionStatusPill = ({ status, statusReason, kind = 'nominator' }: Props) => {
  const { t } = useI18n();

  if (status === 'unknown') {
    return <Skeleton width="62px" height="22px" />;
  }

  const hint =
    kind === 'validator'
      ? t(`dashboard.staking.positions.statusHint.validator.${status}`)
      : statusReason
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
