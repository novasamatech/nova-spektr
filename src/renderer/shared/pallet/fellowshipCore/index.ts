import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const fellowshipCorePallet = {
  consts,
  schema,
  storage,
};

export {
  type FellowshipCoreMemberEvidence,
  type FellowshipCoreMemberStatus,
  type FellowshipCoreParams,
} from './schema';
