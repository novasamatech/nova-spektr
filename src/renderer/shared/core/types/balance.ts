import { type BN } from '@polkadot/util';
import { type z } from 'zod';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type AssetId, type AssetType } from './asset';
import { type ChainId } from './general';

export type TransferableMode =
  /**
   * ORML and statemine assets uses legacy format. Also, some pallets like
   * multisig also calculates balance changes in legacy format.
   */
  | 'legacy'
  /**
   * All native assets uses new format.
   */
  | 'holdAndFreezes';

export type BalanceId = string & z.$brand<'BalanceId'>;

export type Balance = AssetBalance & {
  id: BalanceId;
  chainId: ChainId;
  accountId: AccountId;
  assetId: AssetId;
  assetType: AssetType;
  providers: number;
  consumers: number;
  sufficients: number;
  transferableMode: TransferableMode;
  ed: BN;
};

export type BalanceDraft = Partial<AssetBalance> & {
  chainId: ChainId;
  accountId: AccountId;
  assetId: AssetId;
  assetType: AssetType;
  providers?: number;
  consumers?: number;
  sufficients?: number;
  transferableMode?: TransferableMode;
  ed?: BN;
};

export type AssetBalance = {
  free: BN;
  reserved: BN;
  frozen: BN;
  locked: AssetLock[];
};

export type AssetLock = {
  type: LockTypes;
  amount: BN;
};

export const enum LockTypes {
  /**
   * @deprecated Staking amounts should be retrieved from the staking ledger's
   *   `active` field via stakingUtils.subscribeStaking() instead of balance
   *   locks. Balance locks are unreliable for determining actual staked
   *   amounts.
   */
  STAKING = '0x7374616b696e6720',
  CONVICTION_VOTE = '0x7079636f6e766f74',
}

export type BalanceMap = Record<BalanceId, Balance>;
