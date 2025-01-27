import { fellowshipHeaderCardsSlot } from '@/pages/Fellowship/ui/Fellowship';

import { ProfileCard } from './components/ProfileCard';
import { SetActiveConfirmation } from './components/SetActiveConfirmation';
import { fellowshipProfileFeature } from './model/feature';
import { setActive } from './model/setActive';

export { fellowshipProfileFeature, SetActiveConfirmation, setActive };

fellowshipProfileFeature.inject(fellowshipHeaderCardsSlot, {
  order: 0,
  render: () => <ProfileCard />,
});
