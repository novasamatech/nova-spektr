import { sample } from 'effector';

import { feed } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';

const $list = fellowship.$store.map(s => s?.feed ?? []);

sample({
  clock: fellowshipTasksFeature.running,
  target: feed.subscribe,
});

sample({
  clock: fellowshipTasksFeature.stopped,
  target: feed.unsubscribe,
});

export const activity = {
  $list,
};
