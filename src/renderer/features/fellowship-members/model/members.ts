import { sample } from 'effector';
import { or } from 'patronum';

import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { membersFeatureStatus } from './status';

const $list = fellowshipModel.$store.map(
  store => store?.members?.filter(collectiveDomain.membersService.isCoreMember) ?? [],
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
  $pending: or(collectiveDomain.members.pending, membersFeatureStatus.isStarting),
  $fulfilled: collectiveDomain.members.fulfilled,
};
