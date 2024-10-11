import { MembersCard } from './components/MembersCard';
import { membersModel } from './model/members';

export const fellowshipMembersFeature = {
  model: {
    members: membersModel,
  },
  views: {
    MembersCard,
  },
};
