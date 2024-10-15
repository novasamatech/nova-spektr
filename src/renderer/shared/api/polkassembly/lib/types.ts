import { type Address, type HexString } from '@/shared/core';

export type PolkassemblyProposalType =
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

export type PolkassemblyTrackStatus =
  | 'All'
  | 'Created'
  | 'Confirmed'
  | 'ConfirmStarted'
  | 'ConfirmAborted'
  | 'Cancelled'
  | 'Deciding'
  | 'DecisionDepositPlaced'
  | 'Killed'
  | 'Submitted'
  | 'Rejected'
  | 'TimedOut';

export type PolkassemblyVoteType = 'Motion' | 'Fellowship' | 'Referendum' | 'ReferendumV2' | 'DemocracyProposal';

export type PolkassemblyListingPost = {
  comments_count: number;
  created_at: string;
  curator: string | null;
  description: string | null;
  end: string | null;
  hash: HexString;
  method?: string;
  post_id: number;
  post_reactions: {
    '👍': number;
    '👎': number;
  };
  proposer: Address;
  status: PolkassemblyTrackStatus;
  title: string;
  topic?: {
    name: string;
    id: number;
  };
  type: PolkassemblyProposalType;
  user_id: number | null;
};

export type PolkassemblyFellowshipListingReferendum = Omit<PolkassemblyListingPost, 'post_id'> & {
  id: number;
  trackNumber: number;
  content: string | null;
};

export type PolkassembyPostStatus = {
  timestamp: string;
  status: PolkassemblyTrackStatus;
  block: number;
};

export type PolkassemblyDetailedPost = {
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
  status: PolkassemblyTrackStatus;
  statusHistory: {
    timestamp: string;
    status: PolkassemblyTrackStatus;
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
    statuses: PolkassembyPostStatus[];
    type: PolkassemblyVoteType;
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

export type PolkassemblyPostVote = {
  decision: 'yes' | 'no' | 'abstain';
  voter: Address;
  balance: { value: string } | { abstain: string | null; aye: string; nay: string };
  lockPeriod: number | null;
};

export type PolkassemblyPostVotesResponse = {
  abstain: {
    count: number;
    votes: PolkassemblyPostVote[];
  };
  yes: {
    count: number;
    votes: PolkassemblyPostVote[];
  };
  no: {
    count: number;
    votes: PolkassemblyPostVote[];
  };
};
