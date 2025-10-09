import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { FellowshipOverview } from './components/FellowshipOverview';
import { FellowshipOverviewModal } from './components/FellowshipOverviewModal';
import { fellowshipOverviewFeature } from './model/feature';
import { fellowship } from './model/fellowship';
import { promotion } from './model/promotion';

export { fellowshipOverviewFeature, FellowshipOverviewModal, fellowship, promotion };

fellowshipOverviewFeature.inject(fellowshipSidebarSlot, {
  order: 2.5, // TODO: Replace with actual order when overview relayout is merged
  render: () => (
    <>
      <FellowshipOverview />
      <FellowshipOverviewModal />
    </>
  ),
});
