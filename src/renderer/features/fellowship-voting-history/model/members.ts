import { sample } from 'effector';
import { or } from 'patronum';

import { dictionary } from '@/shared/lib/utils';
import { member } from '@/domains/collectives';

import { votingHistoryFeatureStatus } from './feature';
import { fellowshipModel } from './fellowship';

const $members = fellowshipModel.$store.map(store => dictionary(store?.members ?? [], 'accountId'));

sample({
  clock: votingHistoryFeatureStatus.running,
  target: member.subscribe,
});

sample({
  clock: votingHistoryFeatureStatus.stopped,
  target: member.unsubscribe,
});

export const membersModel = {
  $members,
  $pending: or(member.pending, votingHistoryFeatureStatus.isStarting),
  $fulfilled: member.fulfilled,
};
