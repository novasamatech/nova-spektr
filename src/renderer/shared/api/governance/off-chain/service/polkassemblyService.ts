import { BN } from '@polkadot/util';

import {
  type PolkassemblyListingPost,
  type PolkassemblyPostVote,
  type PolkassembyPostStatus,
  polkassemblyApiService,
} from '@shared/api/polkassembly';
import { dictionary } from '@shared/lib/utils';
import { type GovernanceApi, type ReferendumTimelineRecord } from '../lib/types';

const getReferendumList: GovernanceApi['getReferendumList'] = async (chain, callback) => {
  function mapListingPost(data: PolkassemblyListingPost[]) {
    return dictionary(data, 'post_id', (item) => item.title);
  }

  const pages = polkassemblyApiService.fetchPostsList({
    network: chain.specName,
    proposalType: 'referendums_v2',
    limit: 100,
    sortBy: 'newest',
  });

  for await (const page of pages) {
    callback({
      done: false,
      value: mapListingPost(page),
    });
  }

  callback({
    done: true,
    value: undefined,
  });
};

const getReferendumVotes: GovernanceApi['getReferendumVotes'] = (chain, referendumId) => {
  const mapVote = (votes: PolkassemblyPostVote[]) => votes.map((vote) => vote.voter);

  return polkassemblyApiService
    .fetchPostVotes({
      network: chain.specName,
      postId: referendumId,
      voteType: 'ReferendumV2',
    })
    .then(mapVote);
};

/**
 * Request referendum details
 *
 * @param chain
 * @param referendumId Referendum index
 */
const getReferendumDetails: GovernanceApi['getReferendumDetails'] = async (chain, referendumId) => {
  return polkassemblyApiService
    .fetchPost({
      network: chain.specName,
      postId: referendumId,
      proposalType: 'referendums_v2',
    })
    .then((r) => r.content);
};

const mapTimeline = (timeline: PolkassembyPostStatus): ReferendumTimelineRecord => {
  return {
    status: timeline.status,
    date: new Date(timeline.timestamp),
  };
};

const getReferendumTimeline: GovernanceApi['getReferendumTimeline'] = async (chain, referendumId) => {
  return polkassemblyApiService
    .fetchPost({
      network: chain.specName,
      postId: referendumId,
      proposalType: 'referendums_v2',
    })
    .then((r) => r.timeline.flatMap((timeline) => timeline.statuses.map(mapTimeline)));
};

const getReferendumSummary: GovernanceApi['getReferendumSummary'] = async (chain, referendumId) => {
  return polkassemblyApiService
    .fetchPost({
      network: chain.specName,
      postId: referendumId,
      proposalType: 'referendums_v2',
    })
    .then((r) => ({
      ayes: new BN(r.tally.ayes),
      nays: new BN(r.tally.nays),
      support: new BN(r.tally.support),
    }));
};

export const polkassemblyService: GovernanceApi = {
  getReferendumList,
  getReferendumVotes,
  getReferendumDetails,
  getReferendumTimeline,
  getReferendumSummary,
};
