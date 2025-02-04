import { sample } from 'effector';
import { and, or } from 'patronum';

import { memberService, members } from '@/domains/collectives';

import { fellowshipMembersFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $list = fellowshipModel.$store.map(store => store?.members?.filter(memberService.isCoreMember) ?? []);

const $pendingMembers = and(
  members.pending,
  $list.map(member => member.length === 0),
);

sample({
  clock: fellowshipMembersFeature.running,
  target: members.subscribe,
});

sample({
  clock: fellowshipMembersFeature.stopped,
  target: members.unsubscribe,
});

export const membersModel = {
  $list,
  $pending: or($pendingMembers, fellowshipMembersFeature.isStarting),
  $fulfilled: members.fulfilled,
};
