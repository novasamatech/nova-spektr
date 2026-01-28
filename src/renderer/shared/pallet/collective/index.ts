import { extrinsic } from './extrinsic';
import * as schemas from './schemas';
import { storage } from './storage';

export const collectivePallet = {
  extrinsic,
  storage,
  schemas,
};

export type { CollectiveMemberRecord, CollectiveRank, CollectiveVoteRecord } from './schemas';
