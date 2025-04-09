import { sample } from 'effector';
import { or } from 'patronum';

import { dictionary } from '@/shared/lib/utils';
import { member } from '@/domains/collectives';

import { fellowshipVotingHistoryFeature } from './feature';
import { fellowshipModel } from './fellowship';

const $members = fellowshipModel.$store.map(store => dictionary(store?.members ?? [], 'accountId'));

sample({
  clock: fellowshipVotingHistoryFeature.running,
  target: member.subscribe,
});

sample({
  clock: fellowshipVotingHistoryFeature.stopped,
  target: member.unsubscribe,
});

export const membersModel = {
  $members,
  $pending: or(member.pending, fellowshipVotingHistoryFeature.isStarting),
  $fulfilled: member.fulfilled,
};
