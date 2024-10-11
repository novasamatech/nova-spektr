export type ReferendumMetaProvider = 'subsquare' | 'polkassembly';

export type ReferendumMeta = {
  referendumId: number;
  title: string;
  description: string;
  track: number;
};
