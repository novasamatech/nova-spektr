import { fellowshipHeaderCardsSlot } from '@/pages/Fellowship/ui/Fellowship';

import { ProfileCard } from './components/ProfileCard';
import { fellowshipProfileFeature } from './model/feature';

export { fellowshipProfileFeature };

fellowshipProfileFeature.inject(fellowshipHeaderCardsSlot, {
  order: 0,
  render: () => <ProfileCard />,
});
