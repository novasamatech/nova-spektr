import { sample } from 'effector';
import { and, or } from 'patronum';

import { members, membersService } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { membersFeatureStatus } from './status';

const $list = fellowshipModel.$store.map(store => store?.members?.filter(membersService.isCoreMember) ?? []);

const $pendingMembers = and(
  members.pending,
  $list.map(member => member.length === 0),
);

sample({
  clock: membersFeatureStatus.running,
  target: members.subscribe,
});

sample({
  clock: membersFeatureStatus.stopped,
  target: members.unsubscribe,
});

export const membersModel = {
  $list,
  $pending: or($pendingMembers, membersFeatureStatus.isStarting),
  $fulfilled: members.fulfilled,
};
