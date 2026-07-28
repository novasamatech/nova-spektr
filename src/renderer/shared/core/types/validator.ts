import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type ChainId } from './general';

export type Validator = {
  accountId: AccountId;
  chainId: ChainId;
  ownStake: string;
  totalStake: string;
  commission: number;
  blocked: boolean;
  slashed: boolean;
  apy: number;
  avgApy: number;
  nominators: Nominator[];
};

type Nominator = {
  who: AccountId;
  value: string;
};
