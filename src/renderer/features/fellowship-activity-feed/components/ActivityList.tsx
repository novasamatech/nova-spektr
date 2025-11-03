import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useFeed } from '@/domains/collectives';
import { identityService, useIdentities } from '@/domains/network';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

import { ActivityListView } from './ActivityListView';
import { getDescription } from './utils';

export const ActivityList = memo(() => {
  const { t } = useI18n();

  const chain = useFellowshipChain();

  const { data: feed } = useFeed({ palletType: 'fellowship', chain });
  const { data: identities } = useIdentities(
    feed.map(record => record.accountId),
    chain?.chainId,
  );
  const now = Date.now();

  const records = useMemo(
    () =>
      feed.map(record => {
        const identity = identities[record.accountId];
        return {
          ...record,
          name: identity ? identityService.getFullName(identity) : undefined,
          description: getDescription(record, t),
          duration: (now - record.at.getTime()) / 1000,
        };
      }),
    [identities, feed, t],
  );

  return (
    <div className="flex flex-col gap-3 py-4 pb-3">
      <ActivityListView limit={20} feed={records} />
    </div>
  );
});
