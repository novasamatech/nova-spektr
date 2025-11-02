import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { MembersCard } from './components/MembersCard';
import { fellowshipMembersFeature } from './feature';

export { fellowshipMembersFeature };

fellowshipMembersFeature.inject(fellowshipSidebarSlot, {
  order: 2,
  render: () => <MembersCard />,
});
