import { combine, sample } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { evidence } from '@/domains/collectives';

import { fellowshipSalaryFeature } from './feature';
import { member } from './member';

const $fellowshipEvidences = evidence.$list.map(s => s['fellowship'] ?? {});
const $chainEvidences = combine(fellowshipSalaryFeature.input, $fellowshipEvidences, (input, evidences) => {
  if (nullable(input)) return [];
  return evidences[input.chainId] ?? [];
});

const $memberEvidence = combine(member.$member, $chainEvidences, (member, evidences) => {
  return member ? (evidences.find(e => e.accountId === member.accountId) ?? null) : null;
});

const $hasRetentionEvidence = $memberEvidence.map(x => x?.wish === 'Retention');

const evendenceRequested = fellowshipSalaryFeature.running.filterMap(({ api, palletType, chain, member }) => {
  if (!member) return;
  return {
    api,
    palletType,
    chain,
    accountId: member.accountId,
  };
});

sample({
  clock: evendenceRequested,
  target: evidence.request,
});

export const retentionEvidence = {
  $memberEvidence,
  $hasRetentionEvidence,
};
