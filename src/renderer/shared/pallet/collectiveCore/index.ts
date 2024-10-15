import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const collectiveCorePallet = {
  consts,
  schema,
  storage,
};

export {
  type CollectiveCoreMemberEvidence,
  type CollectiveCoreMemberStatus,
  type CollectiveCoreParams,
} from './schema';
