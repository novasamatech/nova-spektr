import { memo } from 'react';

import { ActivityListBase } from './ActivityListBase';

export const ActivityList = memo(() => {
  return (
    <div className="flex flex-col gap-3 py-4 pb-3">
      <ActivityListBase />
    </div>
  );
});
