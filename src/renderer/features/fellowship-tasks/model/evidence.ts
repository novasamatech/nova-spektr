import { format } from 'date-fns/format';
import { attach, combine, sample } from 'effector';

import { series } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { getCreatedDateFromApi } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { evidence, memberService } from '@/domains/collectives';
import { identity } from '@/domains/network';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';

// evidences

const requestEvidenceFx = attach({ effect: evidence.request });
const requestEvidenceSummaryFx = attach({
  source: combine({
    input: fellowshipTasksFeature.input,
    members: fellowship.$store.map(state => state?.members || []),
  }),
  effect: async ({ input, members }, { accountId, isPromotion }: { accountId: AccountId; isPromotion: boolean }) => {
    if (!input) return;

    const identityMap = await identity.request({
      chainId: input.chainId,
      accounts: [accountId],
    });

    const accountIdentity = identityMap[accountId];
    const member = members.find(m => m.accountId === accountId);

    let evidencePeriodStart: string | null = null;
    if (member && memberService.isCoreMember(member)) {
      const periodStart = isPromotion
        ? await getCreatedDateFromApi(member.lastPromotion || member.lastProof, input.api)
        : await getCreatedDateFromApi(member.lastProof, input.api);
      evidencePeriodStart = format(periodStart, 'dd/MM/yyyy');
    }

    const evidenceContent = await evidence.request({
      palletType: input.palletType,
      chainId: input.chainId,
      api: input.api,
      accountId,
    });

    if (evidenceContent) {
      await evidence.requestSummary({
        palletType: input.palletType,
        chainId: input.chainId,
        evidence: evidenceContent.hash,
        accountId,
        githubHandle: accountIdentity?.github,
        evidencePeriodStart,
      });
    }
  },
});

const $members = fellowship.$store.map(s => s?.members ?? []);
const $evidences = fellowship.$store.map(s => s?.evidence ?? []);
const $evidenceSummaries = fellowship.$store.map(s => s?.evidenceSummary ?? []);

const $memberEvidence = combine(memberProfile.$member, $evidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $memberEvidenceSummary = combine($memberEvidence, $evidenceSummaries, (evidence, summaries) => {
  return evidence ? (summaries.find(e => e.hash === evidence.hash) ?? null) : null;
});

const $hasRetentionEvidence = $memberEvidence.map(x => x?.wish === 'Retention');
const $hasPromotionEvidence = $memberEvidence.map(x => x?.wish === 'Promotion');

// requesting data

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, $members),
  fn({ input, data: members }) {
    return members.map(m => ({
      api: input.api,
      palletType: input.palletType,
      chainId: input.chainId,
      accountId: m.accountId,
    }));
  },
  target: series(requestEvidenceFx, { parallel: true, skipErrors: true }),
});

export const evidenceInfo = {
  $evidences,
  $evidenceSummaries,
  $memberEvidence,
  $memberEvidenceSummary,
  $hasRetentionEvidence,
  $hasPromotionEvidence,
  pending: requestEvidenceFx.pending,
  summaryPending: requestEvidenceSummaryFx.pending,
  requestEvidenceSummary: requestEvidenceSummaryFx,
};
