import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { feed } from '@/domains/collectives';

import { fellowshipProfileFeature } from './feature';
import { profile } from './profile';

const $feeds = feed.$list.map(store => store['fellowship'] ?? {});
const $chainFeed = combine($feeds, fellowshipProfileFeature.input, (feeds, input) => {
  if (nullable(input)) return [];

  return feeds[input.chainId] ?? [];
});

const $list = combine($chainFeed, profile.$member, (feed, member) => {
  if (nullable(member)) return [];

  return feed.filter(r => r.accountId === member.accountId);
});

export const activity = {
  $list,
};
