import { BN } from '@polkadot/util';

import { dictionary } from '@shared/lib/utils';
import type { GovernanceApi, ReferendumVote } from '../lib/types';
import { subsquareApiService, SubsquareSimpleReferendum, SubsquareReferendumVote } from '@shared/api/subsquare';

const getReferendumList: GovernanceApi['getReferendumList'] = async (chain, callback) => {
  const network = chain.specName;

  const parseSubsquareData = (data: SubsquareSimpleReferendum[]) =>
    dictionary(data, 'referendumIndex', (item) => item.title);

  return subsquareApiService
    .fetchReferendumList({ network }, (data, done) => callback(parseSubsquareData(data), done))
    .then(parseSubsquareData);
};

const getReferendumDetails: GovernanceApi['getReferendumDetails'] = async (chain, referendumId) => {
  const network = chain.specName;
  try {
    const details = await subsquareApiService.fetchReferendum({ network, referendumId });

    return details.content;
  } catch {
    return undefined;
  }
};

const getReferendumVotes: GovernanceApi['getReferendumVotes'] = (chain, referendumId, callback) => {
  const network = chain.specName;

  const mapVote = (vote: SubsquareReferendumVote): ReferendumVote => {
    let balance: BN | null = null;
    let decision: ReferendumVote['decision'] = 'abstain';

    if ('votes' in vote) {
      balance = new BN(vote.votes);
      decision = vote.aye ? 'aye' : 'nay';
    } else {
      const ayeBalance = new BN(vote.ayeBalance);
      const nayBalance = new BN(vote.nayBalance);
      balance = ayeBalance.add(nayBalance);
      decision = 'abstain';
    }

    return {
      voter: vote.account,
      balance,
      decision,
      conviction: vote.conviction,
    };
  };

  return subsquareApiService
    .fetchReferendumVotes({ network, referendumId }, (data, done) => callback(data.map(mapVote), done))
    .then((data) => data.map(mapVote));
};

export const subsquareService: GovernanceApi = {
  getReferendumList,
  getReferendumDetails,
  getReferendumVotes,
};
