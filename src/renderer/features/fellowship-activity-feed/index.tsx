import { fellowshipContentSlot } from '@/pages/Fellowship/ui/Fellowship';

import { LastActivity } from './components/LastActivity';
import { fellowshipActivityFeedFeature } from './model/feature';

export { fellowshipActivityFeedFeature };

fellowshipActivityFeedFeature.inject(fellowshipContentSlot, {
  order: 1,
  render: () => <LastActivity />,
});
