import { type Address, type HexString, type ReferendumId } from '@shared/core';

export type SubsquareTimelineRecordStatus =
  | 'All'
  | 'Confirmed'
  | 'ConfirmStarted'
  | 'ConfirmAborted'
  | 'Cancelled'
  | 'DecisionStarted'
  | 'Placed'
  | 'Killed'
  | 'Submitted'
  | 'Rejected'
  | 'TimedOut';

export type SubsquareTimelineRecord = {
  name: SubsquareTimelineRecordStatus;
  track: number;
  referendumId: ReferendumId;
  proposer: Address;
  proposalHash: HexString;
  args: unknown;
  indexer: {
    blockHash: HexString;
    blockHeight: number;
    blockTime: number;
    eventIndex: number;
    extrinsicIndex: number;
  };
};

export type SubsquareSimpleReferendum = {
  _id: string;
  referendumIndex: number;
  indexer: {
    blockHeight: number;
    blockHash: HexString;
    blockTime: number;
    eventIndex: number;
    extrinsicIndex: number;
  };
  proposer: Address;
  title: string;
  track: number;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  polkassemblyCommentsCount: number;
  state: {
    name: string;
    indexer: {
      blockHeight: number;
      blockHash: HexString;
      blockTime: number;
    };
    args: {
      tally?: {
        ayes: string | number;
        nays: string | number;
        support: string | number;
      };
    };
  };
  onchainData: {
    timeline: SubsquareTimelineRecord[];
    tally?: {
      ayes: string | number;
      nays: string | number;
      support: string | number;
    };
  };
  author: {
    username: string;
    publicKey: string;
    address: Address;
  };
  commentsCount: number;
};

export type SubsquareFullReferendum = SubsquareSimpleReferendum & {
  content: string;
};

type SubsquareReferendumVoteCommonData = {
  referendumIndex: number;
  account: Address;
  isDelegating: boolean;
  isStandard: boolean;
  isSplit: boolean;
  isSplitAbstain: boolean;
  conviction: number;
  queryAt: number;
};

type SubSquareReferendumDirectVote = SubsquareReferendumVoteCommonData & {
  isDelegating: false;
  balance: string;
  aye: boolean;
  votes: string;
  delegations: {
    votes: string;
    capital: string;
  };
};

type SubSquareReferendumDelegatedVote = SubsquareReferendumVoteCommonData & {
  isDelegating: true;
  balance: string;
  aye: boolean;
  votes: string;
};

type SubsquareReferendumAbstainVote = SubsquareReferendumVoteCommonData & {
  ayeBalance: string;
  ayeVotes: string;
  nayBalance: string;
  nayVotes: string;
};

export type SubsquareReferendumVote =
  | SubSquareReferendumDirectVote
  | SubSquareReferendumDelegatedVote
  | SubsquareReferendumAbstainVote;

export type SubsquareReferendumListResponse = {
  items: SubsquareFullReferendum[];
  total: number;
};
