import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { Identity } from './identity';

export type Validator = {
  address: AccountID;
  chainId: ChainId;
  ownStake: string;
  totalStake: string;
  commission: number;
  blocked: boolean;
  isOversubscribed: boolean;
  isSlashed: boolean;
  apy: number;
  identity?: Identity;
};
