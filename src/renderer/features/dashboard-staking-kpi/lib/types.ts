import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type UnbondingChunk, type UnclaimedPayout } from '@/domains/staking';

import { type AccessMode } from './access';

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
  unclaimedFiat: string;
  /** Eras with something unclaimed, ascending. */
  eras: number[];
  payouts: UnclaimedPayout[];
  accessMode: AccessMode;
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
  accessMode: AccessMode;
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
  validatorCount: number;
  earning: boolean;
};
