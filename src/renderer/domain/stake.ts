import { AccountID, ChainId } from '@renderer/domain/shared-kernel';

export type Stake = {
  accountId: AccountID;
  chainId: ChainId;
  controller: AccountID;
  stash: AccountID;
  active: string;
  total: string;
  unlocking: Unlocking[];
};

type Unlocking = {
  value: string;
  era: string;
};
