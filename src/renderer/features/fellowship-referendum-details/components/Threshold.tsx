import { BN_MILLION } from '@polkadot/util';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { DetailRow } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import {
  type Referendum,
  type VotingThreshold,
  referendumService,
  trackService,
  useMaxRank,
  useMembers,
  useTracks,
} from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

type Props = {
  referendum: Referendum | null;
  pending: boolean;
};

const useThresholds = (referendum: Referendum | null) => {
  const api = useFellowshipApi();
  const { data: members, pending: pendingMembers } = useMembers({ palletType: 'fellowship', api });
  const { data: tracks, pending: pendingTracks } = useTracks({ palletType: 'fellowship', api });
  const { data: maxRank, pending: pendingMaxRank } = useMaxRank({ palletType: 'fellowship', api });

  const threshold = useMemo<Record<'support' | 'approval', VotingThreshold> | null>(() => {
    if (nullable(maxRank) || nullable(referendum)) {
      return null;
    }

    if (referendumService.isCompleted(referendum)) {
      return null;
    }

    const track = tracks.find(t => t.id === referendum.track);
    if (nullable(track)) {
      return null;
    }

    return {
      support: trackService.supportThreshold({
        track,
        maxRank,
        members,
        tally: referendum.tally,
      }),
      approval: trackService.approvalThreshold({
        track,
        maxRank,
        tally: referendum.tally,
      }),
    };
  }, [referendum, tracks, maxRank, members]);

  return { data: threshold, pending: pendingMembers || pendingTracks || pendingMaxRank };
};

export const Threshold = memo(({ referendum, pending }: Props) => {
  const { t } = useI18n();
  const { data: threshold, pending: thresholdPending } = useThresholds(referendum);

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
