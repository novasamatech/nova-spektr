import { Identity } from '@renderer/domain/identity';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';

export type Validator = {
  address: AccountID;
  chainId: ChainId;
  ownStake: string;
  totalStake: string;
  commission: number;
  blocked: boolean;
  oversubscribed: boolean;
  slashed: boolean;
  apy: number;
  identity?: Identity;
  avgApy: number;
  nominators: string[];
};
