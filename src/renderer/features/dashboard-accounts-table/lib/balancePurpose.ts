import { BN, BN_ZERO } from '@polkadot/util';

import { type Balance } from '@/shared/core';
import { totalAmountBN, transferableAmountBN, vestedLockedAmountBN, votedAmountBN } from '@/shared/lib/utils';

export type PurposeSplit = {
  transferable: BN;
  /**
   * Null — staking is not applicable to this (chain, asset); render "—", never
   * 0
   */
  staked: BN | null;
  /** Null — governance locks cannot exist on this asset; render "—", never 0 */
  governance: BN | null;
  other: BN;
  /**
   * Vesting folded into `other`; display-only "incl. X vested" hint, never
   * summed
   */
  vestedHint: BN;
};

/**
 * Purpose-based waterfall partition of `free + reserved`: transferable → staked
 * (ledger, capped) → governance (conviction locks, capped) → other (remainder).
 * Buckets always sum exactly to the total; caps make overlaps (frozen = max of
 * locks, Asset Hub staking = holds on reserved) impossible to leak into
 * negative "other". Staked MUST come from the staking ledger —
 * LockTypes.STAKING is deprecated and absent on Asset Hub.
 */
export const splitBalanceByPurpose = (
  balance: Balance,
  stakedActive: BN | null,
  governanceApplicable: boolean,
): PurposeSplit => {
  const transferable = transferableAmountBN(balance);
  const nonTransferable = totalAmountBN(balance).sub(transferable);

  const staked = stakedActive === null ? null : BN.min(stakedActive, nonTransferable);
  const afterStaked = nonTransferable.sub(staked ?? BN_ZERO);

  const governance = governanceApplicable ? BN.min(votedAmountBN(balance), afterStaked) : null;
  const other = afterStaked.sub(governance ?? BN_ZERO);

  const vestedHint = BN.min(vestedLockedAmountBN(balance), other);

  return { transferable, staked, governance, other, vestedHint };
};
