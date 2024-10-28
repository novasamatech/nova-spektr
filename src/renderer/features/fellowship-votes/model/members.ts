import { sample } from 'effector';
import { or } from 'patronum';

import { dictionary } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { votesFeatureStatus } from './status';

const $members = fellowshipModel.$store.map(x => dictionary(x?.members ?? [], 'accountId'));

sample({
  clock: votesFeatureStatus.running,
  target: collectiveDomain.members.subscribe,
});

sample({
  clock: votesFeatureStatus.stopped,
  target: collectiveDomain.members.unsubscribe,
});

export const membersModel = {
  $members,
  $pending: or(collectiveDomain.members.pending, votesFeatureStatus.isStarting),
  $fulfilled: collectiveDomain.members.fulfilled,
};
