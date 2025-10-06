import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { FellowshipOverviewButton } from './components/FellowshipOverviewButton';
import { FellowshipOverviewModal } from './components/FellowshipOverviewModal';
import { fellowshipOverviewFeature } from './model/feature';
import { fellowship } from './model/fellowship';

export { fellowshipOverviewFeature, FellowshipOverviewModal, fellowship };

fellowshipOverviewFeature.inject(fellowshipSidebarSlot, {
  order: 0,
  render: () => (
    <>
      <FellowshipOverviewButton />
      <FellowshipOverviewModal />
    </>
  ),
});
