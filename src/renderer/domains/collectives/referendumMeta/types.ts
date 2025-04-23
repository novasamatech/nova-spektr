import { type ChainId } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type CollectivePalletsType } from '../_lib/types';

export type ReferendumMetaProvider = 'subsquare' | 'polkassembly';

export type ReferendumMeta = {
  referendumId: ReferendumId;
  title: string;
  description: string;
  track: number;
  created: number;
  status: string;
  pallet: CollectivePalletsType;
  chainId: ChainId;
};
