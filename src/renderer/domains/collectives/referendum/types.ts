import { type AnyJson } from '@polkadot/types/types';
import { type BN } from '@polkadot/util';

import { type ChainId, type HexString } from '@/shared/core';
import { type ReferendumId, type TrackId } from '@/shared/pallet/referenda';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

export type Tally = {
  ayes: number;
  nays: number;
  bareAyes: number;
};

export type Deposit = {
  who: AccountId;
  amount: BN;
};

export type EvidenceProposal = {
  type: 'Evidence';
  accountId: AccountId;
  rank?: number;
};

export type RfcProposal = {
  type: 'Rfc';
  pullRequest: string;
  documentHash: string;
};

export type UnknownProposal = {
  type: 'Unknown';
  description?: string;
};

export type WhitelistProposal = {
  type: 'Whitelist';
  proposalHex: HexString;
  proposalHash: HexString;
  proposalJSON: Record<string, AnyJson>;
};

export type SpendProposal = {
  type: 'Spend';
  amount: BN;
};

export type Proposal = EvidenceProposal | RfcProposal | UnknownProposal | WhitelistProposal | SpendProposal;

export type OngoingReferendum = {
  type: 'Ongoing';
  id: ReferendumId;
  chainId: ChainId;
  pallet: CollectivePalletsType;
  origin: string;
  track: TrackId;
  proposal: Proposal | null;
  submitted: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
  inQueue: boolean;
  enactment: {
    value: number;
    type: 'At' | 'After';
  };
  deciding: {
    since: BlockHeight;
    confirming: BlockHeight | null;
  } | null;
  ends: BlockHeight;
  tally: Tally;
};

export type RejectedReferendum = {
  type: 'Rejected';
  id: ReferendumId;
  chainId: ChainId;
  pallet: CollectivePalletsType;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type ApprovedReferendum = {
  type: 'Approved';
  id: ReferendumId;
  chainId: ChainId;
  pallet: CollectivePalletsType;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type CancelledReferendum = {
  type: 'Cancelled';
  id: ReferendumId;
  chainId: ChainId;
  pallet: CollectivePalletsType;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type TimedOutReferendum = {
  type: 'TimedOut';
  id: ReferendumId;
  chainId: ChainId;
  pallet: CollectivePalletsType;
  since: BlockHeight;
  submissionDeposit: Deposit | null;
  decisionDeposit: Deposit | null;
};

export type KilledReferendum = {
  type: 'Killed';
  id: ReferendumId;
  chainId: ChainId;
  pallet: CollectivePalletsType;
  since: BlockHeight;
};

export type CompletedReferendum =
  | RejectedReferendum
  | ApprovedReferendum
  | CancelledReferendum
  | TimedOutReferendum
  | KilledReferendum;

export type Referendum = OngoingReferendum | CompletedReferendum;
