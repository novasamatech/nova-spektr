import { type HexString } from '@/shared/core';

export interface DecodedTransaction<Args extends NonNullable<unknown>> {
  type: 'decoded';
  section: string;
  method: string;
  args: Args;
}

export interface EncodedTransaction {
  type: 'encoded';
  callData: HexString;
}

export type AnyDecodedTransaction<Args extends NonNullable<unknown> = NonNullable<unknown>> = DecodedTransaction<Args>;
export type AnyTransaction = EncodedTransaction | AnyDecodedTransaction;

export type Section =
  | 'Balances'
  | 'IdentityJudgement'
  | 'Auctions'
  | 'Crowdloan'
  | 'Registrar'
  | 'Proxy'
  | 'Staking'
  | 'Session'
  | 'FastUnstake'
  | 'VoterList'
  | 'NominationPools'
  | 'Treasury'
  | 'Bounties'
  | 'ChildBounties'
  | 'ConvictionVoting'
  | 'Referenda'
  | 'Whitelist'
  | 'Utility'
  | 'System'
  | 'Scheduler'
  | 'Babe'
  | 'Timestamp'
  | 'Indices'
  | 'Grandpa'
  | 'Claims'
  | 'Vesting'
  | 'Utility'
  | 'Multisig'
  | 'Slots';
