import { consts } from './consts';
import * as schema from './schema';
import { state } from './state';

export const coreFellowshipPallet = {
  consts,
  schema,
  state,
};

export type { CoreFellowshipParams, CoreFellowshipMemberStatus, CoreFellowshipMemberEvidence } from './schema';
