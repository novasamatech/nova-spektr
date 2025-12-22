import { type ChainId, type HexString } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

export type ReferendumMetaProvider = 'subsquare' | 'polkassembly';

export type ReferendumMeta = {
  referendumId: ReferendumId;
  chainId: ChainId;
  pallet: CollectivePalletsType;
  title: string;
  description: string;
  track: number;
  created: number;
  status: string;
  blockHash?: HexString;
  proposer: AccountId;
};
