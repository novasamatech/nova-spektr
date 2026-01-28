import { consts } from './consts';
import { toReferendumId } from './helpers';
import * as schema from './schema';
import { storage } from './storage';

export const referendaPallet = {
  consts,
  storage,
  schema,
  helpers: {
    toReferendumId,
  },
};

export {
  type CollectiveRawOrigin,
  type FrameSupportDispatchRawOrigin,
  type FrameSupportPreimagesBounded,
  type FrameSupportScheduleDispatchTime,
  type KitchensinkRuntimeOriginCaller,
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
} from './schema';
