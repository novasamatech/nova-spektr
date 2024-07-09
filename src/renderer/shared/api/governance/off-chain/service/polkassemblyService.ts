import type { Chain, ReferendumId } from '@shared/core';
import type { GovernanceApi, ReferendumVote } from '../lib/types';
import { dictionary } from '@shared/lib/utils';
import { polkassemblyApiService, ListingOnChainPost, PostVote } from '../../../polkassembly';

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
  const mapDecision = (x: PostVote['decision']): ReferendumVote['decision'] => {
    switch (x) {
      case 'abstain':
        return 'abstain';
      case 'no':
        return 'nay';
      case 'yes':
        return 'aye';
    }
  };

  const mapVote = (votes: PostVote[]): ReferendumVote[] => {
    return votes.map(({ decision, voter }) => ({
      decision: mapDecision(decision),
      voter,
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
async function getReferendumDetails(chain: Chain, referendumId: ReferendumId): Promise<string | undefined> {
  return polkassemblyApiService
    .fetchPost({
      network: chain.specName,
      postId: referendumId,
      proposalType: 'referendums_v2',
    })
    .then((r) => r.content);
}

export const polkassemblyService: GovernanceApi = {
  getReferendumList,
  getReferendumVotes,
  getReferendumDetails,
};
