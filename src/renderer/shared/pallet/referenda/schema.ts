import { z } from 'zod';

import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type ReferendumId = z.infer<typeof referendumId>;
export const referendumId = pjsSchema.u32.brand('referendumId');

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
  maxDeciding: pjsSchema.blockHeight,
  decisionDeposit: pjsSchema.u128,
  preparePeriod: pjsSchema.blockHeight,
  decisionPeriod: pjsSchema.blockHeight,
  confirmPeriod: pjsSchema.blockHeight,
  minEnactmentPeriod: pjsSchema.blockHeight,
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
  since: pjsSchema.blockHeight,
  confirming: pjsSchema.optional(pjsSchema.blockHeight),
});

export type FrameSupportScheduleDispatchTime = z.infer<typeof frameSupportScheduleDispatchTime>;
export const frameSupportScheduleDispatchTime = pjsSchema.enumValue({
  At: pjsSchema.blockHeight,
  After: pjsSchema.blockHeight,
});

export type FrameSupportDispatchRawOrigin = z.infer<typeof frameSupportScheduleDispatchTime>;
const frameSupportDispatchRawOrigin = pjsSchema.enumValue({
  Root: z.undefined(),
  None: z.undefined(),
  Signed: pjsSchema.accountId,
});

export type FrameSupportPreimagesBounded = z.infer<typeof frameSupportPreimagesBounded>;
const frameSupportPreimagesBounded = pjsSchema.enumValue({
  Inline: pjsSchema.bytesHex,
  Lookup: pjsSchema.structHex,
  Legacy: pjsSchema.structHex,
});

export type CollectiveRawOrigin = z.infer<typeof collectiveRawOrigin>;
const collectiveRawOrigin = pjsSchema.enumValueLoose({
  // TODO what does it mean?
  Members: z.tuple([pjsSchema.u32, pjsSchema.u32]),
  Member: pjsSchema.accountId,
  Phantom: z.undefined(),
});

export type FellowshipRawOrigin = z.infer<typeof collectiveRawOrigin>;
const fellowshipRawOrigin = pjsSchema.enumValueLoose({
  Architects: pjsSchema.null,

  FastPromoteTo1Dan: pjsSchema.null,
  FastPromoteTo2Dan: pjsSchema.null,
  FastPromoteTo3Dan: pjsSchema.null,

  Fellows: pjsSchema.null,

  Fellowship2Dan: pjsSchema.null,
  Fellowship5Dan: pjsSchema.null,
  Fellowship6Dan: pjsSchema.null,
  Fellowship8Dan: pjsSchema.null,
  Fellowship9Dan: pjsSchema.null,

  Masters: pjsSchema.null,
  Members: pjsSchema.null,

  PromoteTo1Dan: pjsSchema.null,
  PromoteTo2Dan: pjsSchema.null,
  PromoteTo3Dan: pjsSchema.null,
  PromoteTo4Dan: pjsSchema.null,
  PromoteTo5Dan: pjsSchema.null,
  PromoteTo6Dan: pjsSchema.null,

  RetainAt1Dan: pjsSchema.null,
  RetainAt2Dan: pjsSchema.null,
  RetainAt3Dan: pjsSchema.null,
  RetainAt4Dan: pjsSchema.null,
  RetainAt5Dan: pjsSchema.null,
  RetainAt6Dan: pjsSchema.null,
});

export type KitchensinkRuntimeOriginCaller = z.infer<typeof kitchensinkRuntimeOriginCaller>;
export const kitchensinkRuntimeOriginCaller = pjsSchema.enumValueLoose({
  Void: z.undefined(),
  System: frameSupportDispatchRawOrigin,
  Council: collectiveRawOrigin,
  TechnicalCommittee: collectiveRawOrigin,
  AllianceMotion: collectiveRawOrigin,
  FellowshipOrigins: fellowshipRawOrigin,
});

// TODO move to ranked pallet
export type PalletRankedCollectiveTally = z.infer<typeof palletRankedCollectiveTally>;
export const palletRankedCollectiveTally = pjsSchema.object({
  bareAyes: pjsSchema.u32,
  ayes: pjsSchema.u32,
  nays: pjsSchema.u32,
});

export type ReferendaReferendumStatusRankedCollectiveTally = z.infer<
  typeof referendaReferendumStatusRankedCollectiveTally
>;
export const referendaReferendumStatusRankedCollectiveTally = pjsSchema.object({
  track: trackId,
  origin: kitchensinkRuntimeOriginCaller,
  proposal: frameSupportPreimagesBounded,
  enactment: frameSupportScheduleDispatchTime,
  submitted: pjsSchema.blockHeight,
  submissionDeposit: referendaDeposit,
  decisionDeposit: pjsSchema.optional(referendaDeposit),
  deciding: pjsSchema.optional(referendaDecidingStatus),
  tally: z.union([convictionVotingPallet.schema.convictionVotingTally, palletRankedCollectiveTally]),
  inQueue: pjsSchema.bool,
  alarm: pjsSchema.optional(
    pjsSchema.tupleMap(
      ['referendum', referendumId],
      ['info', pjsSchema.tupleMap(['referendum', referendumId], ['since', pjsSchema.blockHeight])],
    ),
  ),
});

export type ReferendaReferendumInfoCompletedTally = z.infer<typeof referendaReferendumInfoCompletedTally>;
export const referendaReferendumInfoCompletedTally = pjsSchema.tupleMap(
  ['since', pjsSchema.blockHeight],
  ['submissionDeposit', pjsSchema.optional(referendaDeposit)],
  ['decisionDeposit', pjsSchema.optional(referendaDeposit)],
);

export type ReferendaReferendumInfoConvictionVotingTally = z.infer<typeof referendaReferendumInfoConvictionVotingTally>;
export const referendaReferendumInfoConvictionVotingTally = pjsSchema.enumValue({
  Ongoing: referendaReferendumStatusRankedCollectiveTally,
  Approved: referendaReferendumInfoCompletedTally,
  Rejected: referendaReferendumInfoCompletedTally,
  Cancelled: referendaReferendumInfoCompletedTally,
  TimedOut: referendaReferendumInfoCompletedTally,
  Killed: pjsSchema.blockHeight,
});
