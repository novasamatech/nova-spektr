import { type HexString } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';

export type ReferendumMetaProvider = 'subsquare' | 'polkassembly';

export type Indexer = {
  blockHeight: number;
  blockHash: HexString;
  blockTime: number;
  eventIndex: number;
  extrinsicIndex: number;
};

export type ReferendumMeta = {
  referendumId: ReferendumId;
  title: string;
  description: string;
  track: number;
  created: number;
  status: string;
  blockHash?: HexString;
};
