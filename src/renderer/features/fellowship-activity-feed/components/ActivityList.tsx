import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { identityService } from '@/domains/network';
import { identityModel } from '../model/identity';
import { activityFeed } from '../model/list';

import { ActivityListView } from './ActivityListView';
import { getDescription } from './utils';

export const ActivityList = memo(() => {
  const { t } = useI18n();

  const feed = useUnit(activityFeed.$activityFeed);
  const identities = useUnit(identityModel.$list);
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
