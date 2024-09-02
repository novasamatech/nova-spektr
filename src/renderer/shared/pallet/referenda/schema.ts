import { z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjsSchemas';
import { convictionVotingPallet } from '@shared/pallet/convictionVoting';

export type ReferendumId = z.infer<typeof referendumId>;
export const referendumId = pjsSchema.u32;

export type TrackId = z.infer<typeof trackId>;
export const trackId = pjsSchema.u16;

export type ReferendaCurve = z.infer<typeof referendaCurve>;
export const referendaCurve = pjsSchema.enumValue({
  LinearDecreasing: pjsSchema.object({
    length: pjsSchema.perbill,
    floor: pjsSchema.perbill,
    ceil: pjsSchema.perbill,
  }),
  SteppedDecreasing: pjsSchema.object({
    begin: pjsSchema.perbill,
    end: pjsSchema.perbill,
    step: pjsSchema.perbill,
    period: pjsSchema.perbill,
  }),
  Reciprocal: pjsSchema.object({
    factor: pjsSchema.i64,
    xOffset: pjsSchema.i64,
    yOffset: pjsSchema.i64,
  }),
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

export type ReferendaReferendumStatusRankedCollectiveTally = z.infer<
  typeof referendaReferendumStatusRankedCollectiveTally
>;
export const referendaReferendumStatusRankedCollectiveTally = pjsSchema.object({
  track: trackId,
  // TODO
  origin: pjsSchema.u32,
  // TODO
  proposal: pjsSchema.u32,
  // TODO
  enactment: frameSupportScheduleDispatchTime,
  submitted: pjsSchema.u32,
  submissionDeposit: referendaDeposit,
  decisionDeposit: pjsSchema.optional(referendaDeposit),
  deciding: pjsSchema.optional(referendaDecidingStatus),
  tally: convictionVotingPallet.schema.convictionVotingTally,
  inQueue: z.boolean(),
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
  ['submitionDeposit', referendaDeposit],
  ['decisionDeposit', referendaDeposit],
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
