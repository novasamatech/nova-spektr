import { sample } from 'effector';
import { or } from 'patronum';

import { dictionary } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';

import { votingHistoryFeatureStatus } from './feature';
import { fellowshipModel } from './fellowship';

const $members = fellowshipModel.$store.map(store => dictionary(store?.members ?? [], 'accountId'));

sample({
  clock: votingHistoryFeatureStatus.running,
  target: collectiveDomain.members.subscribe,
});

sample({
  clock: votingHistoryFeatureStatus.stopped,
  target: collectiveDomain.members.unsubscribe,
});

export const membersModel = {
  $members,
  $pending: or(collectiveDomain.members.pending, votingHistoryFeatureStatus.isStarting),
  $fulfilled: collectiveDomain.members.fulfilled,
};
