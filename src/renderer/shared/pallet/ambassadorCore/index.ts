import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const ambassadorCorePallet = {
  consts,
  schema,
  storage,
};

export {
  type AmbassadorCoreMemberEvidence,
  type AmbassadorCoreMemberStatus,
  type AmbassadorCoreParams,
} from './schema';
