import { consts } from './consts';
import * as schema from './schema';
import { state } from './state';

export const fellowshipCorePallet = {
  consts,
  schema,
  state,
};

export {
  type CoreFellowshipMemberEvidence,
  type CoreFellowshipMemberStatus,
  type CoreFellowshipParams,
} from './schema';
