import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { nullable } from '@/shared/lib/utils';
import { evidence, evidenceService, memberService } from '@/domains/collectives';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowshipProfileFeature } from './feature';
import { fellowship } from './fellowship';
import { profile } from './profile';

// evidences

const $evidences = fellowship.$store.map(s => s?.evidence ?? []);

const $memberEvidence = combine(profile.$member, $evidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $hasPromotionEvidence = $memberEvidence.map(x => x?.wish === 'Promotion');

// periods

const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);

const $leftToPromotion = combine(
  { periods: $periods, currentBlock: fellowshipNetwork.$currentBlock, member: profile.$member },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock)) {
      return null;
    }

    return evidenceService.getBlockUntilNextPromotion(member, periods, currentBlock);
  },
);

// requesting data

const evidenceRequested = fellowshipProfileFeature.running.filterMap(({ api, palletType, chainId, member }) => {
  if (nullable(member)) return;

  return {
    api,
    palletType,
    chainId,
    accounts: [member.accountId],
  };
});

sample({
  clock: evidenceRequested,
  target: evidence.request,
});

const evidencePeriodsRequested = fellowshipProfileFeature.running.filterMap(({ palletType, chain }) => {
  return {
    palletType,
    chainId: chain.chainId,
  };
});

sample({
  clock: evidencePeriodsRequested,
  target: evidence.requestPeriods,
});

// attention message

const $showAttention = createStore(true);
const hideAttention = createEvent();

persist({
  key: 'fellowship-evidence-show-attention',
  store: $showAttention,
  sync: true,
});

sample({
  clock: hideAttention,
  fn: () => false,
  target: $showAttention,
});

export const evidenceInfo = {
  $leftToPromotion,
  $hasPromotionEvidence,
};
