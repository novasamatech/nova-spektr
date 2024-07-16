import { BN } from '@polkadot/util';

import { dictionary } from '@shared/lib/utils';
import { polkassemblyApiService, ListingOnChainPost, PostVote, PolkassembyPostStatus } from '@shared/api/polkassembly';
import { GovernanceApi, ReferendumTimelineRecord, ReferendumVote } from '../lib/types';

const referendumDecisionMap: Record<PostVote['decision'], ReferendumVote['decision']> = {
  abstain: 'abstain',
  yes: 'aye',
  no: 'nay',
};

const getReferendumList: GovernanceApi['getReferendumList'] = async (chain, callback) => {
  function mapListingPost(data: ListingOnChainPost[]) {
    return dictionary(data, 'post_id', (item) => item.title);
  }

  return polkassemblyApiService
    .fetchPostsList(
      {
        network: chain.specName,
        proposalType: 'referendums_v2',
        sortBy: 'newest',
      },
      (data, done) => {
        callback(mapListingPost(data), done);
      },
    )
    .then(mapListingPost);
};

const getReferendumVotes: GovernanceApi['getReferendumVotes'] = (chain, referendumId, callback) => {
  const mapVote = (votes: PostVote[]): ReferendumVote[] => {
    return votes.map(({ decision, voter, balance, lockPeriod }) => ({
      decision: referendumDecisionMap[decision],
      voter,
      balance: new BN('value' in balance ? balance.value : balance.abstain ?? 0),
      conviction: typeof lockPeriod === 'number' ? (lockPeriod === 0 ? 0.1 : lockPeriod) : 0,
    }));
  };

  return polkassemblyApiService
    .fetchPostVotes(
      {
        network: chain.specName,
        postId: referendumId,
        voteType: 'ReferendumV2',
      },
      (data, done) => {
        callback(mapVote(data), done);
      },
    )
    .then(mapVote);
};

/**
 * Request referendum details
 * @param chain
 * @param referendumId referendum index
 */
const getReferendumDetails: GovernanceApi['getReferendumDetails'] = async (chain, referendumId) =>
  polkassemblyApiService
    .fetchPost({
      network: chain.specName,
      postId: referendumId,
      proposalType: 'referendums_v2',
    })
    .then((r) => r.content);

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

export const polkassemblyService: GovernanceApi = {
  getReferendumList,
  getReferendumVotes,
  getReferendumDetails,
  getReferendumTimeline,
};
