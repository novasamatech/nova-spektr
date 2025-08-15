import { type BN } from '@polkadot/util';

import { type AssetBalance } from '@/shared/core';

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
      balance: AssetBalance;
    }
  | {
      success: false;
      imbalance: BN;
      balance: AssetBalance;
    };
