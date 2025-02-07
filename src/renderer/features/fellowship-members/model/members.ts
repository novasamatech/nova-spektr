import { sample } from 'effector';
import { and, or } from 'patronum';

import { member, memberService } from '@/domains/collectives';

import { fellowshipMembersFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $list = fellowshipModel.$store.map(store => store?.members?.filter(memberService.isCoreMember) ?? []);

const $pendingMembers = and(
  member.pending,
  $list.map(member => member.length === 0),
);

sample({
  clock: fellowshipMembersFeature.running,
  target: member.subscribe,
});

sample({
  clock: fellowshipMembersFeature.stopped,
  target: member.unsubscribe,
});

export const membersModel = {
  $list,
  $pending: or($pendingMembers, fellowshipMembersFeature.isStarting),
  $fulfilled: member.fulfilled,
};
