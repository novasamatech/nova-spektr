import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { LastActivity } from './components/LastActivity';
import { fellowshipActivityFeedFeature } from './model/feature';

export { fellowshipActivityFeedFeature };

fellowshipActivityFeedFeature.inject(fellowshipSidebarSlot, {
  order: 3,
  render: () => <LastActivity />,
});
