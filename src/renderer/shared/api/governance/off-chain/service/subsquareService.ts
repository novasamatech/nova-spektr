import { BN } from '@polkadot/util';

import { dictionary } from '@shared/lib/utils';
import {
  subsquareApiService,
  SubsquareSimpleReferendum,
  SubsquareReferendumVote,
  SubsquareTimelineRecord,
} from '@shared/api/subsquare';
import { GovernanceApi, ReferendumTimelineRecord, ReferendumTimelineRecordStatus, ReferendumVote } from '../lib/types';
import { SubsquareTimelineRecordStatus } from '../../../subsquare/lib/types';

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

const getReferendumTimeline: GovernanceApi['getReferendumTimeline'] = async (chain, referendumId) => {
  const mapStatus = (status: SubsquareTimelineRecordStatus): ReferendumTimelineRecordStatus => {
    switch (status) {
      case 'Placed':
        return 'DecisionDepositPlaced';
      case 'DecisionStarted':
        return 'Deciding';
      default:
        return status;
    }
  };

  const mapTimeline = (timeline: SubsquareTimelineRecord): ReferendumTimelineRecord => {
    return {
      status: mapStatus(timeline.name),
      date: new Date(timeline.indexer.blockTime),
    };
  };

  return subsquareApiService
    .fetchReferendum({ network: chain.specName, referendumId })
    .then((r) => r.onchainData.timeline.map(mapTimeline));
};

export const subsquareService: GovernanceApi = {
  getReferendumList,
  getReferendumVotes,
  getReferendumDetails,
  getReferendumTimeline,
};
