import * as schemas from './schemas';
import { state } from './state';

export const collectivePallet = {
  state,
  schemas,
};

export type { CollectiveRank, CollectiveVoteRecord, CollectiveMemberRecord } from './schemas';
