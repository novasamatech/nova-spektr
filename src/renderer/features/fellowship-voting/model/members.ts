import { sample } from 'effector';

import { member } from '@/domains/collectives';

import { fellowshipVotingFeature } from './feature';
import { fellowship } from './fellowship';

const $list = fellowship.$store.map(s => s?.members ?? []);

sample({
  clock: fellowshipVotingFeature.running,
  target: member.subscribe,
});

sample({
  clock: fellowshipVotingFeature.stopped,
  target: member.unsubscribe,
});

export const members = {
  $list,
};
