import { fellowshipHeaderCardsSlot } from '@/pages/Fellowship/ui/Fellowship';

import { MembersCard } from './components/MembersCard';
import { fellowshipMembersFeature } from './model/feature';

export { fellowshipMembersFeature };

fellowshipMembersFeature.inject(fellowshipHeaderCardsSlot, {
  order: 4,
  render: () => <MembersCard />,
});
