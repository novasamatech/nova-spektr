import * as schemas from './schemas';
import { storage } from './storage';

export const collectivePallet = {
  storage,
  schemas,
};

export type { CollectiveRank, CollectiveVoteRecord, CollectiveMemberRecord } from './schemas';
