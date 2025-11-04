export { $collectiveStore } from './init';

export * as config from './configuration/inject';
export type { CollectivePalletsType } from './_lib/types';

export { referendum } from './referendum/store';
export { referendumService } from './referendum/service';
export { useReferendums } from './referendum/hooks';
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
export { useReferendumMeta } from './referendumMeta/hooks';
export type { ReferendumMeta } from './referendumMeta/types';

export { member } from './member/store';
export { memberService } from './member/service';
export { useMembers, useCoreMembers, useMember } from './member/hooks';
export type { Member, CoreMember } from './member/types';

export { evidence } from './evidence/store';
export { evidenceService } from './evidence/service';
export {
  useEvidences,
  useEvidencesContent,
  useEvidencePeriod,
  useEvidenceSummary,
  useEvidenceToReferendumRelations,
} from './evidence/hooks';
export type {
  Evidence,
  EvidenceContent,
  EvidencePeriods,
  EvidenceSummary,
  EvidenceTransaction,
  CurrentMemberPeriod,
} from './evidence/types';

export { feed } from './feed/store';
export { useFeed } from './feed/hooks';
export type { FeedRecord, FeedEventReferendum } from './feed/types';

export { rfc } from './rfc/store';
export { useRfcSummary } from './rfc/hooks';
export type { RfcDetails } from './rfc/types';

export { salary } from './salary/store';
export { salaryService } from './salary/service';
export { useSalaries, useSalaryCycleResource, useSalaryClaimStatusResource } from './salary/hooks';

export { track } from './tracks/store';
export { trackService } from './tracks/service';
export { useTracks, useMaxRank } from './tracks/hooks';
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
export { votingHistoryService } from './votingHistory/service';
export { useVotes, useAllVotes } from './votingHistory/hooks';
export type { Vote, VotingRating } from './votingHistory/types';
