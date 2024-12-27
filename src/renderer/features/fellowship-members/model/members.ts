import { sample } from 'effector';
import { and, or } from 'patronum';

import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { membersFeatureStatus } from './status';

const $list = fellowshipModel.$store.map(
  store => store?.members?.filter(collectiveDomain.membersService.isCoreMember) ?? [],
);

const $pendingMembers = and(
  collectiveDomain.members.pending,
  $list.map(member => member.length === 0),
);

sample({
  clock: membersFeatureStatus.running,
  target: collectiveDomain.members.subscribe,
});

sample({
  clock: membersFeatureStatus.stopped,
  target: collectiveDomain.members.unsubscribe,
});

export const membersModel = {
  $list,
  $pending: or($pendingMembers, membersFeatureStatus.isStarting),
  $fulfilled: collectiveDomain.members.fulfilled,
};
