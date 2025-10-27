import { combine, sample } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { feed } from '@/domains/collectives';

import { fellowshipActivityFeedFeature } from './feature';

const $feeds = feed.$list.map(store => store['fellowship'] ?? {});
const $chainFeed = combine($feeds, fellowshipActivityFeedFeature.input, (feeds, input) => {
  if (nullable(input)) return [];

  return feeds[input.chainId] ?? [];
});

const $activityFeed = $chainFeed.map(feed => {
  return feed.filter(r => r.type !== 'paid' && r.type !== 'referendum');
});

sample({
  clock: fellowshipActivityFeedFeature.running,
  target: feed.subscribe,
});

sample({
  clock: fellowshipActivityFeedFeature.stopped,
  target: feed.unsubscribe,
});

export const activityFeed = {
  $activityFeed,
};
