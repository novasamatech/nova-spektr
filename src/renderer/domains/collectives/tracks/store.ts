import { maxRankResource, tracksResource } from './resource';

export const track = {
  $list: tracksResource.$cache,
  $maxRank: maxRankResource.$cache,
  pending: tracksResource.fetch.pending,
  request: tracksResource.fetch,
};
