import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { nullable } from '@/shared/lib/utils';
import { evidenceService, memberService } from '@/domains/collectives';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';

import { fellowshipProfileFeature } from './feature';
import { fellowship } from './fellowship';

// evidences

const $member = fellowshipProfileFeature.input.map(store => (store ? store.member : null));
const $evidences = fellowship.$store.map(s => s?.evidence ?? []);

const $memberEvidence = combine($member, $evidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $hasPromotionEvidence = $memberEvidence.map(x => x?.wish === 'Promotion');

// periods

const $periods = fellowship.$store.map(store => store?.evidencePeriods ?? null);

const $leftToPromotion = combine(
  { periods: $periods, currentBlock: fellowshipNetwork.$currentBlock, member: $member },
  ({ periods, currentBlock, member }) => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock))
      return null;
    return evidenceService.getBlockUntilNextPropotion(member, periods, currentBlock);
  },
);

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
