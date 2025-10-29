import { type BN } from '@polkadot/util';

import { type Balance } from '@/shared/core';

export type BalancePreservation =
  /**
   * We do not want account's balance to become lower than ED
   */
  | 'keepAlive'

  /**
   * We do not care about account's balance becoming lower than ED
   */
  | 'allowDeath';

/**
 * Each local balance update can lead to success or failure. LOL
 */
export type BalanceUpdateResult =
  | {
      success: true;
      required: BN;
      balance: Balance;
      burned: BN;
    }
  | {
      success: false;
      imbalance: BN;
      required: BN;
      balance: Balance;
      burned: BN;
    };
