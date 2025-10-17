import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { FellowshipOverview } from './components/FellowshipOverview';
import { FellowshipOverviewModal } from './components/FellowshipOverviewModal';
import { fellowshipOverviewFeature } from './model/feature';
import { fellowship } from './model/fellowship';
import { modal } from './model/modal';
import { promotion } from './model/promotion';

export { fellowshipOverviewFeature, FellowshipOverviewModal, fellowship, modal, promotion };

fellowshipOverviewFeature.inject(fellowshipSidebarSlot, {
  order: 1,
  render: () => (
    <>
      <FellowshipOverview />
      <FellowshipOverviewModal />
    </>
  ),
});
