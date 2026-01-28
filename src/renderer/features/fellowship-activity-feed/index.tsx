import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { activityFeedRecordDescriptionSlot } from './components/EventRecord';
import { LastActivity } from './components/LastActivity';
import { referendumEventRecordActionSlot } from './components/ReferendumEventRecord';
import { fellowshipActivityFeedFeature } from './feature';

export { activityFeedRecordDescriptionSlot, fellowshipActivityFeedFeature, referendumEventRecordActionSlot };

fellowshipActivityFeedFeature.inject(fellowshipSidebarSlot, {
  order: 2,
  render: () => <LastActivity />,
});
