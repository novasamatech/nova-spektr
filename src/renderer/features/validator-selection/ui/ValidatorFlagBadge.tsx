import { useI18n } from '@/shared/i18n';
import { type LabelVariant, Label, Tooltip } from '@/shared/ui-kit';
import { type ValidatorFlag } from '../lib';

/**
 * Severity read as colour: a slash is a loss that already happened (red), an
 * over-represented operator is a cost the user is about to take on (amber), and
 * "blocked"/"no identity" are statements about what we know rather than
 * warnings (grey).
 */
const FLAG_VARIANT: Record<ValidatorFlag, LabelVariant> = {
  blocked: 'gray',
  slashed: 'red',
  cluster: 'orange',
  noIdentity: 'gray',
};

type Props = {
  flag: ValidatorFlag;
  /** 1-based position inside the operator cluster, only read for `cluster`. */
  clusterPosition?: number;
};

/**
 * The badge carries its own explanation on hover, in the table as well as in
 * the detail pane. It used to be spelled out in a card at the bottom of the
 * pane, which put the answer three scrolls away from the two-word question and
 * only ever answered it for the one validator that happened to be open.
 */
export const ValidatorFlagBadge = ({ flag, clusterPosition }: Props) => {
  const { t } = useI18n();

  const text =
    flag === 'cluster'
      ? t('staking.validatorSelection.badge.cluster', { count: clusterPosition ?? 0, ordinal: true })
      : t(`staking.validatorSelection.badge.${flag}`);

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div tabIndex={0} className="flex">
          <Label variant={FLAG_VARIANT[flag]}>{text}</Label>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{t(`staking.validatorSelection.badgeHint.${flag}`)}</Tooltip.Content>
    </Tooltip>
  );
};
