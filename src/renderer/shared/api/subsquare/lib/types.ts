import { type Address, type HexString } from '@shared/core';

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
  };
  onchainData: unknown;
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
