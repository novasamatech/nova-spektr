import { attach, combine, sample } from 'effector';
import { and, or } from 'patronum';

import { createFlow } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { evidence, evidenceService, referendum, referendumMeta, referendumService } from '@/domains/collectives';
import { identityDomain } from '@/domains/identity';

import { fellowshipReferendumsDetailsFeature } from './feature';
import { fellowshipModel } from './fellowship';

const requestEvidence = attach({ effect: evidence.request });

const flow = createFlow<{ referendumId: ReferendumId | null }>({ referendumId: null });

const $referendumId = flow.state.map(state => state.referendumId);

const $api = fellowshipReferendumsDetailsFeature.input.map(input => input?.api ?? null);
const $evidences = fellowshipModel.$store.map(store => store?.evidence ?? []);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $meta = fellowshipModel.$store.map(store => store?.referendumMeta ?? {});

const $referendum = combine($referendums, $referendumId, (referendums, referendumId) => {
  if (referendums.length === 0 || referendumId === null) return null;

  return referendums.find(referendum => referendum.id === referendumId) ?? null;
});

const $identities = combine(
  identityDomain.identity.$list,
  fellowshipReferendumsDetailsFeature.input,
  (identities, input) => {
    if (nullable(input)) return {};

    return identities[input.chainId] ?? {};
  },
);

const $referendumMeta = combine($meta, $referendumId, (meta, referendumId) => {
  if (referendumId === null) return null;

  return meta[referendumId] ?? null;
});

const $proposer = combine($referendum, $api, (referendum, api) => {
  if (nullable(api) || nullable(referendum) || referendumService.isCompleted(referendum)) return null;

  return referendum.proposal.type === 'Inline'
    ? evidenceService.getProposalAccount(api, referendum.proposal.data)
    : null;
});

const $proposerIdentity = combine($identities, $proposer, (identities, proposer) => {
  if (nullable(proposer)) return null;

  return identities[proposer] ?? null;
});

const $evidence = combine($evidences, $proposer, (list, proposer) => {
  if (nullable(proposer)) return null;

  return list.find(x => x.accountId === proposer) ?? null;
});

const $pendingReferendum = and($referendum.map(nullable), referendum.pending);
const $pendingReferendumMeta = and($referendumMeta.map(nullable), referendumMeta.pending);

const proposeEvidenceRequested = attachToFeatureInput(fellowshipReferendumsDetailsFeature, $proposer).filterMap(
  ({ input, data }) => {
    if (nullable(data)) return;

    return {
      api: input.api,
      palletType: input.palletType,
      chain: input.chain,
      accountId: data,
    };
  },
);

sample({
  clock: proposeEvidenceRequested,
  target: requestEvidence,
});

export const referendumDetails = {
  flow,

  $proposer,
  $proposerIdentity,
  $evidence,
  $referendum,
  $referendumMeta,

  $pendingEvidence: requestEvidence.pending,
  $pendingProposer: identityDomain.identity.pending,
  $pendingMeta: or($pendingReferendumMeta, fellowshipReferendumsDetailsFeature.isStarting),
  $pending: or($pendingReferendum, fellowshipReferendumsDetailsFeature.isStarting),
  $fulfilled: and(referendum.fulfilled, fellowshipReferendumsDetailsFeature.isRunning),
};
