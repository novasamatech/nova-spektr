import { combine } from 'effector';
import { createGate } from 'effector-react';

import { createStoreFromEffect } from '@/shared/effector';
import { getCreatedDateFromApi, getExpectedBlockTime, nonNullable, nullable } from '@/shared/lib/utils';
import { type Member, evidenceService, memberService, referendumService, trackService } from '@/domains/collectives';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowship } from './fellowship';

export enum RetentionWidgetState {
  WAITING = 'waiting',
  WARNING_APPROACHING = 'warning_approaching',
  WARNING_URGENT = 'warning_urgent',
  CRITICAL_LAST_CALL = 'critical_last_call',
  CRITICAL_EXPIRED = 'critical_expired',
  REPORT_SUBMITTED = 'report_submitted',
  REFERENDUM_CREATED = 'referendum_created',
}

// Time thresholds in days (for reference and UI display)
export const DANGER_THRESHOLD_DAYS = 2;
export const WARNING_THRESHOLD_DAYS = 14;
export const APPROACHING_THRESHOLD_DAYS = 30;

const flow = createGate<Member | null>({ defaultState: null });

const $member = flow.state;
const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);
const $evidences = fellowship.$store.map(store => store?.evidence ?? null);
const $referendums = fellowship.$store.map(store => store?.referendums ?? null);
const $feed = fellowship.$store.map(store => store?.feed ?? null);

const $retentionEvidence = combine($evidences, $member, (evidences, member) => {
  if (nullable(member)) return null;

  return evidences?.find(e => e.wish === 'Retention' && e.accountId === member.accountId) ?? null;
});

const $hasRetentionEvidence = $retentionEvidence.map(nonNullable);

const $retentionEvidenceSubmissionDate = combine(
  { retentionEvidence: $retentionEvidence, feed: $feed },
  ({ retentionEvidence, feed }) => {
    if (nullable(retentionEvidence)) return null;

    return (
      feed?.find(e => e.accountId === retentionEvidence.accountId && e.type === 'requested' && e.wish === 'Retention')
        ?.at ?? null
    );
  },
);

const $retentionReferendum = combine(
  { referendums: $referendums, member: $member, retentionEvidence: $retentionEvidence },
  ({ referendums, member, retentionEvidence }) => {
    if (nullable(referendums) || nullable(member)) return null;

    const referendum = referendums.filter(referendumService.isOngoing).find(r => {
      const proposer = referendumService.getProposer(r) || retentionEvidence?.accountId;
      return trackService.isRetentionTrack(r.track) && proposer === member.accountId;
    });

    return referendum ?? null;
  },
);

const $hasRetentionReferendum = $retentionReferendum.map(nonNullable);

const $retentionPeriod = combine({ member: $member, periods: $periods }, ({ member, periods }) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;

  const from = member.lastProof;
  const retentionPeriodLength = evidenceService.getDemotionPeriod(member, periods);

  return {
    from,
    to: from + retentionPeriodLength,
  };
});

const $leftToEndOfPeriod = combine(
  { period: $retentionPeriod, currentBlock: fellowshipNetwork.$currentBlock },
  ({ period, currentBlock }) => {
    if (nullable(period) || nullable(currentBlock)) return null;

    return period.to - currentBlock;
  },
);

// Calculate block thresholds based on network's expected block time
const $blockThresholds = fellowshipNetwork.$network.map(network => {
  if (nullable(network)) return null;

  const blockTimeMs = getExpectedBlockTime(network.api).toNumber();
  const msPerDay = 24 * 60 * 60 * 1000;

  return {
    danger: Math.ceil((DANGER_THRESHOLD_DAYS * msPerDay) / blockTimeMs),
    warning: Math.ceil((WARNING_THRESHOLD_DAYS * msPerDay) / blockTimeMs),
    approaching: Math.ceil((APPROACHING_THRESHOLD_DAYS * msPerDay) / blockTimeMs),
  };
});

const { $: $retentionPeriodDates } = createStoreFromEffect({
  params: {
    period: $retentionPeriod,
    api: fellowshipNetwork.$network.map(network => network?.api ?? null),
  },
  defaultValue: null,
  fn: async ({ period, api }) => {
    if (!period || !api) return null;

    const [from, to] = await Promise.all([
      getCreatedDateFromApi(period.from, api),
      getCreatedDateFromApi(period.to, api),
    ]);

    return { from: new Date(from), to: new Date(to) };
  },
});

const $widgetState = combine(
  {
    blocksLeft: $leftToEndOfPeriod,
    blockThresholds: $blockThresholds,
    hasRetentionReferendum: $hasRetentionReferendum,
    hasRetentionEvidence: $hasRetentionEvidence,
  },
  ({ blocksLeft, blockThresholds, hasRetentionEvidence, hasRetentionReferendum }) => {
    if (nullable(blocksLeft) || nullable(blockThresholds)) return null;

    if (hasRetentionReferendum) {
      return RetentionWidgetState.REFERENDUM_CREATED;
    }

    if (hasRetentionEvidence) {
      return RetentionWidgetState.REPORT_SUBMITTED;
    }

    if (blocksLeft < 0) {
      return RetentionWidgetState.CRITICAL_EXPIRED;
    }

    if (blocksLeft <= blockThresholds.danger) {
      return RetentionWidgetState.CRITICAL_LAST_CALL;
    }

    if (blocksLeft <= blockThresholds.warning) {
      return RetentionWidgetState.WARNING_URGENT;
    }

    if (blocksLeft <= blockThresholds.approaching) {
      return RetentionWidgetState.WARNING_APPROACHING;
    }

    return RetentionWidgetState.WAITING;
  },
);

export const fellowshipRetention = {
  flow,
  $member,
  $leftToEndOfPeriod,
  $blockThresholds,
  $widgetState,
  $retentionEvidence,
  $retentionReferendum,
  $retentionPeriod,
  $retentionPeriodDates,
  $retentionEvidenceSubmissionDate,
};
