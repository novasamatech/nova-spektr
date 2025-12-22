import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useCoreMembers, useFeed, useReferendums, useTracks } from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain, useFellowshipIdentities } from '@/aggregates/fellowship-network';

import { ActivityListView } from './ActivityListView';
import { buildActivityRecords, collectActivityAccountIds } from './utils';

export const ActivityList = memo(() => {
  const { t } = useI18n();

  const chain = useFellowshipChain();
  const api = useFellowshipApi();

  const { data: feed, pending: feedPending } = useFeed({ palletType: 'fellowship', chain });
  const { data: referendums, pending: referendumsPending } = useReferendums({ palletType: 'fellowship', api });
  const { data: tracks, pending: tracksPending } = useTracks({ palletType: 'fellowship', api });
  const { data: members } = useCoreMembers({ palletType: 'fellowship', api });

  const allAccountIds = useMemo(
    () =>
      collectActivityAccountIds(
        feed,
        referendums ? new Map(referendums.map(r => [r.id, r])) : undefined,
        members.map(m => m.accountId),
      ),
    [feed, referendums, members],
  );

  const { data: identities } = useFellowshipIdentities(allAccountIds);

  const records = useMemo(
    () =>
      buildActivityRecords({
        feed,
        referendums,
        tracks,
        identities,
        chain,
        t,
      }),
    [feed, referendums, tracks, identities, chain, t],
  );

  const pending = feedPending || referendumsPending || tracksPending;

  return (
    <div className="flex flex-col gap-3 py-4 pb-3">
      <ActivityListView limit={20} feed={records} pending={pending} />
    </div>
  );
});
