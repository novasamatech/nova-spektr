import { combine } from 'effector';

import { createFlow, createStoreFromEffect } from '@/shared/effector';
import { getCreatedDateFromApi, nonNullable, nullable } from '@/shared/lib/utils';
import {
  type Member,
  type OngoingReferendum,
  evidenceService,
  memberService,
  referendumService,
  trackService,
} from '@/domains/collectives';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowship } from './fellowship';

export enum WidgetState {
  WAITING_OPPORTUNITY = 'waiting_opportunity',
  EVIDENCE_CAN_BE_SUBMITTED = 'evidence_can_be_submitted',
  EVIDENCE_SUBMITTED = 'evidence_submitted',
  REFERENDUM_CREATED = 'referendum_created',
}

const flow = createFlow<{ member: Member | null }>({ member: null });

const $member = flow.state.map(s => s.member);
const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);
const $evidences = fellowship.$store.map(store => store?.evidence ?? null);
const $referendums = fellowship.$store.map(store => store?.referendums ?? null);
const $feed = fellowship.$store.map(store => store?.feed ?? null);

const $leftToPromotion = combine(
  { periods: $periods, currentBlock: fellowshipNetwork.$currentBlock, member: fellowshipMember.$currentMember },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock)) {
      return null;
    }

    return evidenceService.getBlockUntilNextPromotion(member, periods, currentBlock);
  },
);

const $promotionEvidence = combine($evidences, $member, (evidences, member) => {
  if (nullable(member)) return null;

  return evidences?.find(e => e.wish === 'Promotion' && e.accountId === member.accountId) ?? null;
});

const $hasPromotionEvidence = $promotionEvidence.map(nonNullable);

const $promotionEvidenceSubmissionDate = combine(
  { promotionEvidence: $promotionEvidence, feed: $feed },
  ({ promotionEvidence, feed }) => {
    if (nullable(promotionEvidence)) return null;

    return (
      feed?.find(e => e.accountId === promotionEvidence.accountId && e.type === 'requested' && e.wish === 'Promotion')
        ?.at ?? null
    );
  },
);

const $promotionReferendum = combine(
  { referendums: $referendums, member: $member, promotionEvidence: $promotionEvidence },
  ({ referendums, member, promotionEvidence }) => {
    if (nullable(referendums) || nullable(member)) return null;

    const referendum = referendums.find(r => {
      const proposer = referendumService.getProposer(r) || promotionEvidence?.accountId;
      return referendumService.isOngoing(r) && trackService.isPromotionTrack(r.track) && proposer === member.accountId;
    });

    return (referendum as OngoingReferendum) ?? null;
  },
);

const $hasPromotionReferendum = $promotionReferendum.map(nonNullable);

const $widgetState = combine(
  {
    leftToPromotion: $leftToPromotion,
    hasPromotionReferendum: $hasPromotionReferendum,
    hasPromotionEvidence: $hasPromotionEvidence,
  },
  ({ leftToPromotion, hasPromotionEvidence, hasPromotionReferendum }) => {
    if (nullable(leftToPromotion) || leftToPromotion > 0) {
      return WidgetState.WAITING_OPPORTUNITY;
    }

    if (hasPromotionReferendum) {
      return WidgetState.REFERENDUM_CREATED;
    }

    if (hasPromotionEvidence) {
      return WidgetState.EVIDENCE_SUBMITTED;
    }

    return WidgetState.EVIDENCE_CAN_BE_SUBMITTED;
  },
);

const $promotionPeriod = combine({ member: $member, periods: $periods, feed: $feed }, ({ member, periods, feed }) => {
  if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;

  const importedBlock = feed?.find(f => f.accountId === member.accountId && f.type === 'imported')?.block ?? 0;

  const from = member.lastPromotion !== 0 ? member.lastPromotion : importedBlock;

  return {
    from,
    to: evidenceService.getPromotionPeriod(member, periods) + from,
  };
});

const $promotionPeriodDates = createStoreFromEffect({
  params: {
    period: $promotionPeriod,
    api: fellowshipNetwork.$network.map(network => network?.api ?? null),
  },
  defaultValue: { from: new Date(), to: new Date() },
  fn: async ({ period, api }) => {
    const [from, to] = await Promise.all([
      getCreatedDateFromApi(period.from, api),
      getCreatedDateFromApi(period.to, api),
    ]);

    return { from: new Date(from), to: new Date(to) };
  },
});

export const fellowshipPromotion = {
  $member,
  $leftToPromotion,
  $widgetState,
  $promotionEvidence,
  $promotionReferendum,
  $promotionPeriod,
  $promotionPeriodDates: $promotionPeriodDates.$,
  $currentBlock: fellowshipNetwork.$currentBlock,
  $promotionEvidenceSubmissionDate,
};
