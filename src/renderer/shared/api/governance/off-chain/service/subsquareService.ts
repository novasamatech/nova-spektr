import { BN } from '@polkadot/util';

import {
  type SubsquareReferendumVote,
  type SubsquareSimpleReferendum,
  type SubsquareTimelineRecord,
  subsquareApiService,
} from '@shared/api/subsquare';
import { dictionary } from '@shared/lib/utils';
import { type SubsquareTimelineRecordStatus } from '../../../subsquare/lib/types';
import { type GovernanceApi, type ReferendumTimelineRecord, type ReferendumTimelineRecordStatus } from '../lib/types';

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

  const mapVote = (vote: SubsquareReferendumVote) => vote.account;

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

const getReferendumSummary: GovernanceApi['getReferendumSummary'] = async (chain, referendumId) => {
  return subsquareApiService.fetchReferendum({ network: chain.specName, referendumId }).then((r) => ({
    ayes: new BN(r.onchainData.tally ? BigInt(r.onchainData.tally.ayes).toString() : '0'),
    nays: new BN(r.onchainData.tally ? BigInt(r.onchainData.tally.nays).toString() : '0'),
    support: new BN(r.onchainData.tally ? BigInt(r.onchainData.tally.support).toString() : '0'),
  }));
};

export const subsquareService: GovernanceApi = {
  getReferendumList,
  getReferendumVotes,
  getReferendumDetails,
  getReferendumTimeline,
  getReferendumSummary,
};
