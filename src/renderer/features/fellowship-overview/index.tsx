import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { FellowshipOverview } from './components/FellowshipOverview';
import { FellowshipOverviewModal } from './components/FellowshipOverviewModal';
import { fellowshipOverviewFeature } from './model/feature';

export { fellowshipOverviewFeature, FellowshipOverview, FellowshipOverviewModal };

fellowshipOverviewFeature.inject(fellowshipSidebarSlot, {
  order: 1,
  render: () => (
    <>
      <FellowshipOverview />
      <FellowshipOverviewModal />
    </>
  ),
});
