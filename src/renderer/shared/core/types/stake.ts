import { type Address, type ChainId } from './general';

export type Stake = {
  address: Address;
  chainId: ChainId;
  controller: Address;
  stash: Address;
  active: string;
  total: string;
  unlocking: Unlocking[];
};

export type Unlocking = {
  value: string;
  era: string;
};

export const enum RewardsDestination {
  RESTAKE = 'restake',
  TRANSFERABLE = 'transferable',
}
