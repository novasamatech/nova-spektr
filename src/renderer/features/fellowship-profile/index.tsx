import { fellowshipHeaderCardsSlot } from '@/pages/Fellowship/ui/Fellowship';

import { ProfileCard, hasActionRequestAnyOf } from './components/ProfileCard';
import { profileInfoSlot } from './components/ProfileModal';
import { SetActiveConfirmation } from './components/SetActiveConfirmation';
import { fellowshipProfileFeature } from './model/feature';
import { setActive } from './model/setActive';

export { fellowshipProfileFeature, SetActiveConfirmation, setActive, profileInfoSlot, hasActionRequestAnyOf };

fellowshipProfileFeature.inject(fellowshipHeaderCardsSlot, {
  order: 0,
  render: () => <ProfileCard />,
});
