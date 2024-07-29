import { type Address, type ChainId } from './general';
import { type Identity } from './identity';

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
