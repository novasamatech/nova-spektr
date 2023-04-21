import { Identity } from '@renderer/domain/identity';
import { Address, ChainId } from '@renderer/domain/shared-kernel';

export type Validator = {
  address: Address;
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
  nominators: Nominator[];
};

type Nominator = {
  who: Address;
  value: string;
};
