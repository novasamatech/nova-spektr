import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { ProfileCard, additionalProfileCardInfoSlot } from './components/ProfileCard';
import { profileInfoSlot } from './components/ProfileModal';
import { SetActiveConfirmation } from './components/SetActiveConfirmation';
import { fellowshipProfileFeature } from './model/feature';
import { setActive } from './model/setActive';

export { fellowshipProfileFeature, SetActiveConfirmation, setActive, profileInfoSlot, additionalProfileCardInfoSlot };

fellowshipProfileFeature.inject(fellowshipSidebarSlot, {
  order: 0,
  render: () => <ProfileCard />,
});
