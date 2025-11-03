import { BN_MILLION } from '@polkadot/util';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { DetailRow } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { type Referendum, referendumService } from '@/domains/collectives';
import { useThreshold } from '../hooks/useThreshold';

type Props = {
  referendum: Referendum | null;
  pending: boolean;
};

export const Threshold = memo(({ referendum, pending }: Props) => {
  const { t } = useI18n();
  const { data: threshold, pending: thresholdPending } = useThreshold(referendum);

  if (referendum && referendumService.isCompleted(referendum)) {
    return null;
  }

  const value = nonNullable(threshold) ? threshold.support.value.div(BN_MILLION).toNumber() / 10 : 0;

  return (
    <Skeleton active={(pending && nullable(referendum)) || thresholdPending} fullWidth>
      <DetailRow label={t('fellowship.voting.threshold')}>{value}%</DetailRow>
    </Skeleton>
  );
});
