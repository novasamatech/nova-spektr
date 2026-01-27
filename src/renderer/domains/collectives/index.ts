export { $collectiveStore } from './init';

export * as config from './configuration/inject';
export type { CollectivePalletsType } from './_lib/types';

export { referendum } from './referendum/store';
export { referendumService } from './referendum/service';
export { useReferendums } from './referendum/hooks';

export { useReferendumsMapToGovernance } from './governanceReferendumRelation/hooks';
export type {
  ApprovedReferendum,
  CancelledReferendum,
  CompletedReferendum,
  Deposit,
  KilledReferendum,
  OngoingReferendum,
  Proposal,
  Referendum,
  RejectedReferendum,
  RfcProposal,
  Tally,
  TimedOutReferendum,
} from './referendum/types';

export { referendumMeta } from './referendumMeta/store';
export { referendumMetaService } from './referendumMeta/service';
export { useReferendumMeta } from './referendumMeta/hooks';
export type { ReferendumMeta } from './referendumMeta/types';

export { member } from './member/store';
export { memberService } from './member/service';
export { useCoreMembers, useMember, useMembers } from './member/hooks';
export type { CoreMember, Member } from './member/types';

export { evidence } from './evidence/store';
export { evidenceService } from './evidence/service';
export {
  useEvidencePeriod,
  useEvidenceSummary,
  useEvidenceToReferendumRelations,
  useEvidences,
  useEvidencesContent,
} from './evidence/hooks';
export type {
  CurrentMemberPeriod,
  Evidence,
  EvidenceContent,
  EvidencePeriods,
  EvidenceSummary,
  EvidenceTransaction,
} from './evidence/types';

export { feed } from './feed/store';
export { useFeed } from './feed/hooks';
export type { FeedEventReferendum, FeedRecord } from './feed/types';

export { rfc } from './rfc/store';
export { useRfcSummary } from './rfc/hooks';
export type { RfcDetails } from './rfc/types';

export { salary } from './salary/store';
export { salaryService } from './salary/service';
export { useSalaries, useSalaryClaimStatusResource, useSalaryCycleResource } from './salary/hooks';

export { track } from './tracks/store';
export { trackService } from './tracks/service';
export { useMaxRank, useTracks } from './tracks/hooks';
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
export { useAllVotes, useVotes } from './votingHistory/hooks';
export type { Vote, VotingRating } from './votingHistory/types';

export { useCodex } from './codex/hooks';
