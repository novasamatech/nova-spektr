import { consts } from './consts';
import * as schema from './schema';
import { state } from './state';

export const referendaPallet = {
  consts,
  state,
  schema,
};

export {
  type FrameSupportScheduleDispatchTime,
  type ReferendaCurve,
  type ReferendaDecidingStatus,
  type ReferendaDeposit,
  type ReferendaLinearDecreasingCurve,
  type ReferendaReciprocalCurve,
  type ReferendaReferendumInfoCompletedTally,
  type ReferendaReferendumInfoConvictionVotingTally,
  type ReferendaReferendumStatusRankedCollectiveTally,
  type ReferendaSteppedDecreasingCurve,
  type ReferendaTrackInfo,
  type ReferendumId,
  type TrackId,
  type FrameSupportPreimagesBounded,
  type FrameSupportDispatchRawOrigin,
  type KitchensinkRuntimeOriginCaller,
  type CollectiveRawOrigin,
} from './schema';
