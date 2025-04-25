import { type ReferendumId } from '@/shared/pallet/referenda';

export type ReferendumMetaProvider = 'subsquare' | 'polkassembly';

export type ReferendumMeta = {
  referendumId: ReferendumId;
  title: string;
  description: string;
  track: number;
  created: number;
  status: string;
};
