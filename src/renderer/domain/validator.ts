import { Identity } from '@renderer/domain/identity';
import { Address, ChainID } from '@renderer/domain/shared-kernel';

export type Validator = {
  address: Address;
  chainId: ChainID;
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
