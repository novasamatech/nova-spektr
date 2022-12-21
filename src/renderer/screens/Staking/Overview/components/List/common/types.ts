import { AccountID, SigningType } from '@renderer/domain/shared-kernel';

export type AccountStakeInfo = {
  address: AccountID;
  signingType: SigningType;
  accountName: string;
  walletName?: string;
  isSelected: boolean;
  totalReward?: string;
  totalStake?: string;
};
