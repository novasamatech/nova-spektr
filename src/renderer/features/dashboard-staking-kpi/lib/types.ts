import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type DataCompleteness,
  type NetworkAvgRate,
  type UnbondingChunk,
  type UnclaimedPayout,
} from '@/domains/staking';

import { type Access } from './access';

/** One (account × chain) line of the claim drill-down. */
export type ClaimRow = {
  key: string;
  accountId: AccountId;
  chainId: ChainId;
  chainName: string;
  symbol: string;
  precision: number;
  /** Rewards earned over the card's 30-day window, planck. */
  earned: string;
  /** Unclaimed rewards, planck. */
  unclaimed: string;
  /**
   * How far the payout scan has answered for this position.
   *
   * Only `complete` makes a `'0'` mean "nothing to claim". `pending` is "not
   * asked yet", `partial` is "at least this much", `unavailable` is "could not
   * check" — they all look identical in a `'0'` and the screen must not
   * announce the first while it means one of the others.
   */
  unclaimedStatus: DataCompleteness | 'pending';
  unclaimedFiat: string;
  /** Eras with something unclaimed, ascending. */
  eras: number[];
  payouts: UnclaimedPayout[];
};

/** One (account × chain) line of the positions / unbonding drill-down. */
export type PositionRow = {
  key: string;
  accountId: AccountId;
  chainId: ChainId;
  chainName: string;
  symbol: string;
  precision: number;
  staked: string;
  stakedFiat: string;
  unbonding: UnbondingChunk[];
  totalUnbonding: string;
  redeemable: string;
  access: Access;
};

/** One row of the APY / nominations breakdown. */
export type BreakdownRow = {
  key: string;
  accountId: AccountId;
  chainId: ChainId;
  chainName: string;
  symbol: string;
  precision: number;
  /** Drives the donut segment. */
  value: number;
  /** Planck stake behind the segment. */
  stake: string;
  fiat: string;
  color: string;
  /** APY of the chain, percent — `null` when unknown. */
  apy: number | null;
  /** Trailing-window network average of the chain — `null` when unknown. */
  networkAvgRate: NetworkAvgRate | null;
  validatorCount: number;
  earning: boolean;
};
