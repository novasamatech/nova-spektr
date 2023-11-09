import type { Identity } from './identity';
import type { Address, ChainId } from './general';

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
