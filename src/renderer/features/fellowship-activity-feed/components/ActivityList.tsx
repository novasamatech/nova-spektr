import { useUnit } from 'effector-react';
import { memo } from 'react';

import { activityFeed } from '../model/list';

import { ActivityListView } from './ActivityListView';

export const ActivityList = memo(() => {
  const feed = useUnit(activityFeed.$activityFeed);

  return (
    <div className="flex flex-col gap-3 py-4 pb-3">
      <ActivityListView limit={20} feed={feed} />
    </div>
  );
});
