import { useI18n } from '@/shared/i18n';
import { type LabelVariant, Label } from '@/shared/ui-kit';
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

export const ValidatorFlagBadge = ({ flag, clusterPosition }: Props) => {
  const { t } = useI18n();

  const text =
    flag === 'cluster'
      ? t('staking.validatorSelection.badge.cluster', { count: clusterPosition ?? 0, ordinal: true })
      : t(`staking.validatorSelection.badge.${flag}`);

  return <Label variant={FLAG_VARIANT[flag]}>{text}</Label>;
};
