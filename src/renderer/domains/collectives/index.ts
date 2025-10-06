export { $collectiveStore } from './init';

export * as config from './configuration/inject';
export type { CollectivePalletsType } from './_lib/types';

export { referendum } from './referendum/store';
export { referendumService } from './referendum/service';
export type {
  ApprovedReferendum,
  OngoingReferendum,
  Referendum,
  CancelledReferendum,
  CompletedReferendum,
  Deposit,
  KilledReferendum,
  RejectedReferendum,
  Tally,
  TimedOutReferendum,
  RfcProposal,
  Proposal,
} from './referendum/types';

export { referendumMeta } from './referendumMeta/store';
export { referendumMetaService } from './referendumMeta/service';
export type { ReferendumMeta } from './referendumMeta/types';

export { member } from './member/store';
export { memberService } from './member/service';
export type { Member, CoreMember } from './member/types';

export { evidence } from './evidence/store';
export { evidenceService } from './evidence/service';
export type {
  Evidence,
  EvidenceContent,
  EvidencePeriods,
  EvidenceSummary,
  EvidenceTransaction,
  CurrentMemberPeriod,
} from './evidence/types';

export { feed } from './feed/store';
export type { FeedRecord } from './feed/types';

export { rfcDetails } from './rfc/store';

export { salary } from './salary/store';
export { salaryService } from './salary/service';

export { track } from './tracks/store';
export { trackService } from './tracks/service';
export type {
  LinearDecreasingCurve,
  ReciprocalCurve,
  SteppedDecreasingCurve,
  Track,
  VotingCurve,
  VotingThreshold,
} from './tracks/types';

export { votingService } from './voting/service';
export type { VotingTransaction } from './voting/types';

export { voting } from './votingHistory/store';
export type { Vote, VotingRating } from './votingHistory/types';
export { votingHistoryService } from './votingHistory/service';
