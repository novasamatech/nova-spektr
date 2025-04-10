import { consts } from './consts';
import { extrinsic } from './extrinsic';
import * as schema from './schema';
import { storage } from './storage';

export const collectiveCorePallet = {
  extrinsic,
  consts,
  schema,
  storage,
};

export {
  type CollectiveCoreMemberEvidence,
  type CollectiveCoreMemberStatus,
  type CollectiveCoreParams,
} from './schema';
