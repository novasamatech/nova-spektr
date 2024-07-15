import { Address, HexString } from '@shared/core';

export type ProposalType =
  | 'democracy_proposals'
  | 'tech_committee_proposals'
  | 'treasury_proposals'
  | 'referendums'
  | 'fellowship_referendums'
  | 'council_motions'
  | 'bounties'
  | 'tips'
  | 'child_bounties'
  | 'referendums_v2';

export type TrackStatus =
  | 'All'
  | 'Confirmed'
  | 'ConfirmStarted'
  | 'Cancelled'
  | 'Deciding'
  | 'DecisionDepositPlaced'
  | 'Killed'
  | 'Submitted'
  | 'Rejected'
  | 'TimedOut';

export type VoteType = 'Motion' | 'Fellowship' | 'Referendum' | 'ReferendumV2' | 'DemocracyProposal';

export type ListingOnChainPost = {
  comments_count: number;
  created_at: string;
  curator: string | null;
  description: string | null;
  end: string | null;
  hash: HexString;
  method: string;
  post_id: number;
  post_reactions: {
    '👍': number;
    '👎': number;
  };
  proposer: Address;
  status: TrackStatus;
  title: string;
  topic: {
    name: string;
    id: number;
  };
  type: string;
  user_id: number;
};

export type Status = {
  timestamp: string;
  status: TrackStatus;
  block: number;
};

export type DetailedOnChainPost = {
  bond: null;
  comments: unknown[];
  content: string;
  created_at: string;
  curator: null;
  curator_deposit: null;
  deciding: null;
  delay: null;
  deposit: null;
  description: string | null;
  enactment_after_block: number;
  enactment_at_block: null;
  end: null;
  ended_at: string;
  fee: string | null;
  hash: HexString;
  last_edited_at: string;
  origin: string;
  payee: null;
  post_id: number;
  post_reactions: {
    '👍': {
      count: number;
      usernames: string[];
    };
    '👎': {
      count: number;
      usernames: string[];
    };
  };
  proposal_arguments: null;
  proposer: Address;
  reward: null;
  status: TrackStatus;
  statusHistory: {
    timestamp: string;
    status: TrackStatus;
    block: number;
  }[];
  tally: {
    ayes: string;
    bareAyes: null;
    nays: string;
    support: string;
  };
  timeline: {
    created_at: string;
    hash: HexString;
    index: number;
    statuses: Status[];
    type: string;
  }[];
  topic: {
    name: string;
    id: number;
  };
  track_number: number;
  type: string;
  user_id: number;
  title: string;
};

export type PostVote = {
  decision: 'yes' | 'no' | 'abstain';
  voter: Address;
  balance: {
    value: string | null;
  };
  lockPeriod: number;
};

export type PostVotesResponse = {
  abstain: {
    count: number;
    votes: PostVote[];
  };
  yes: {
    count: number;
    votes: PostVote[];
  };
  no: {
    count: number;
    votes: PostVote[];
  };
};
