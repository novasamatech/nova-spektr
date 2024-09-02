import { consts } from './consts';
import * as schema from './schema';
import { state } from './state';

export const referendaPallet = {
  consts,
  state,
  schema,
};

export type {
  ReferendumId,
  TrackId,
  ReferendaReferendumStatusRankedCollectiveTally,
  ReferendaReferendumInfoConvictionVotingTally,
  ReferendaReferendumInfoCompletedTally,
  ReferendaDeposit,
  ReferendaDecidingStatus,
  ReferendaCurve,
  ReferendaTrackInfo,
} from './schema';
