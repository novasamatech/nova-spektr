import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const fellowshipCorePallet = {
  consts,
  schema,
  storage,
};

export {
  type CoreFellowshipMemberEvidence,
  type CoreFellowshipMemberStatus,
  type CoreFellowshipParams,
} from './schema';
