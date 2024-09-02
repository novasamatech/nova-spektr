import { z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjsSchemas';
import { convictionVotingPallet } from '@shared/pallet/convictionVoting';

export type ReferendumId = z.infer<typeof referendumId>;
export const referendumId = pjsSchema.u32;

export type TrackId = z.infer<typeof trackId>;
export const trackId = pjsSchema.u16;

export type ReferendaLinearDecreasingCurve = z.infer<typeof referendaLinearDecreasingCurve>;
const referendaLinearDecreasingCurve = pjsSchema.object({
  length: pjsSchema.perbill,
  floor: pjsSchema.perbill,
  ceil: pjsSchema.perbill,
});

export type ReferendaSteppedDecreasingCurve = z.infer<typeof referendaSteppedDecreasingCurve>;
const referendaSteppedDecreasingCurve = pjsSchema.object({
  begin: pjsSchema.perbill,
  end: pjsSchema.perbill,
  step: pjsSchema.perbill,
  period: pjsSchema.perbill,
});

export type ReferendaReciprocalCurve = z.infer<typeof referendaReciprocalCurve>;
const referendaReciprocalCurve = pjsSchema.object({
  factor: pjsSchema.i64,
  xOffset: pjsSchema.i64,
  yOffset: pjsSchema.i64,
});

export type ReferendaCurve = z.infer<typeof referendaCurve>;
export const referendaCurve = pjsSchema.enumValue({
  LinearDecreasing: referendaLinearDecreasingCurve,
  SteppedDecreasing: referendaSteppedDecreasingCurve,
  Reciprocal: referendaReciprocalCurve,
});

export type ReferendaTrackInfo = z.infer<typeof referendaTrackInfo>;
export const referendaTrackInfo = pjsSchema.object({
  name: pjsSchema.text,
  maxDeciding: pjsSchema.u32,
  decisionDeposit: pjsSchema.u128,
  preparePeriod: pjsSchema.u32,
  decisionPeriod: pjsSchema.u32,
  confirmPeriod: pjsSchema.u32,
  minEnactmentPeriod: pjsSchema.u32,
  minApproval: referendaCurve,
  minSupport: referendaCurve,
});

export type ReferendaDeposit = z.infer<typeof referendaDeposit>;
export const referendaDeposit = pjsSchema.object({
  who: pjsSchema.accountId,
  amount: pjsSchema.u128,
});

export type ReferendaDecidingStatus = z.infer<typeof referendaDecidingStatus>;
export const referendaDecidingStatus = pjsSchema.object({
  since: pjsSchema.u32,
  confirming: pjsSchema.optional(pjsSchema.u32),
});

export type FrameSupportScheduleDispatchTime = z.infer<typeof frameSupportScheduleDispatchTime>;
export const frameSupportScheduleDispatchTime = pjsSchema.enumValue({
  At: pjsSchema.u32,
  After: pjsSchema.u32,
});

const frameSupportDispatchRawOrigin = pjsSchema.enumValue({
  Root: z.undefined(),
  None: z.undefined(),
  Signed: pjsSchema.accountId,
});

const frameSupportPreimagesBounded = pjsSchema.enumValue({
  Legacy: z.unknown(),
  Inline: pjsSchema.bytes,
  Lookup: pjsSchema.object({
    len: pjsSchema.u32,
  }),
});

const collectiveRawOrigin = pjsSchema.enumValue({
  // TODO what does it mean?
  Members: z.tuple([pjsSchema.u32, pjsSchema.u32]),
  Member: pjsSchema.accountId,
  Phantom: z.undefined(),
});

export type KitchensinkRuntimeOriginCaller = z.infer<typeof kitchensinkRuntimeOriginCaller>;
export const kitchensinkRuntimeOriginCaller = pjsSchema.enumValueLoose({
  Void: z.undefined(),
  System: frameSupportDispatchRawOrigin,
  Council: collectiveRawOrigin,
  TechnicalCommittee: collectiveRawOrigin,
  AllianceMotion: collectiveRawOrigin,
});

export type ReferendaReferendumStatusRankedCollectiveTally = z.infer<
  typeof referendaReferendumStatusRankedCollectiveTally
>;
export const referendaReferendumStatusRankedCollectiveTally = pjsSchema.object({
  track: trackId,
  origin: kitchensinkRuntimeOriginCaller,
  proposal: frameSupportPreimagesBounded,
  enactment: frameSupportScheduleDispatchTime,
  submitted: pjsSchema.u32,
  submissionDeposit: referendaDeposit,
  decisionDeposit: pjsSchema.optional(referendaDeposit),
  deciding: pjsSchema.optional(referendaDecidingStatus),
  tally: convictionVotingPallet.schema.convictionVotingTally,
  inQueue: pjsSchema.bool,
  alarm: pjsSchema.optional(
    pjsSchema.tuppleMap(
      ['referendum', referendumId],
      ['info', pjsSchema.tuppleMap(['track', pjsSchema.u32], ['since', pjsSchema.u32])],
    ),
  ),
});

export type ReferendaReferendumInfoCompletedTally = z.infer<typeof referendaReferendumInfoCompletedTally>;
export const referendaReferendumInfoCompletedTally = pjsSchema.tuppleMap(
  ['since', pjsSchema.u32],
  ['submitionDeposit', pjsSchema.optional(referendaDeposit)],
  ['decisionDeposit', pjsSchema.optional(referendaDeposit)],
);

export type ReferendaReferendumInfoConvictionVotingTally = z.infer<typeof referendaReferendumInfoConvictionVotingTally>;
export const referendaReferendumInfoConvictionVotingTally = pjsSchema.enumValue({
  Ongoing: referendaReferendumStatusRankedCollectiveTally,
  Approved: referendaReferendumInfoCompletedTally,
  Rejected: referendaReferendumInfoCompletedTally,
  Cancelled: referendaReferendumInfoCompletedTally,
  TimedOut: referendaReferendumInfoCompletedTally,
  Killed: pjsSchema.u32,
});
