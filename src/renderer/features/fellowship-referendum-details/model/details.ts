import { attach, combine, sample } from 'effector';
import { and, or } from 'patronum';

import { createFlow } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { evidence, referendum, referendumMeta, referendumService } from '@/domains/collectives';
import { identity } from '@/domains/network';

import { fellowshipReferendumsDetailsFeature } from './feature';
import { fellowship } from './fellowship';

const requestEvidenceFx = attach({ effect: evidence.requestContent });

const flow = createFlow<{ referendumId: ReferendumId | null }>({ referendumId: null });

const $referendumId = flow.state.map(state => state.referendumId);

const $evidences = fellowship.$store.map(store => store?.evidenceContent ?? []);
const $referendums = fellowship.$store.map(store => store?.referendums ?? []);
const $meta = fellowship.$store.map(store => store?.referendumMeta ?? []);

const $referendum = combine($referendums, $referendumId, (referendums, referendumId) => {
  if (referendums.length === 0 || referendumId === null) return null;

  return referendums.find(referendum => referendum.id === referendumId) ?? null;
});

const $identities = combine(identity.$list, fellowshipReferendumsDetailsFeature.input, (identities, input) => {
  if (nullable(input)) return {};

  return identities[input.chainId] ?? {};
});

const $referendumMeta = combine($meta, $referendumId, (meta, referendumId) => {
  if (referendumId === null) return null;

  return meta.find(x => x.referendumId === referendumId) ?? null;
});

const $proposer = $referendum.map(referendum => {
  if (nullable(referendum) || referendumService.isCompleted(referendum)) return null;
  return referendumService.getProposer(referendum);
});

const $proposerIdentity = combine($identities, $proposer, (identities, proposer) => {
  if (nullable(proposer)) return null;

  return identities[proposer] ?? null;
});

const $evidence = combine(
  { referendum: $referendum, evidences: $evidences, proposer: $proposer },
  ({ referendum, evidences, proposer }) => {
    if (nullable(referendum)) return null;

    if (referendumService.isOngoing(referendum) && referendum.proposal) {
      if (referendum.proposal.type === 'Evidence') {
        return evidences.find(x => x.accountId === proposer)?.content ?? null;
      }
    }

    return null;
  },
);

const $description = combine({ referendum: $referendum, metadata: $referendumMeta }, ({ referendum, metadata }) => {
  if (nullable(referendum)) return null;

  if (referendumService.isOngoing(referendum) && referendum.proposal) {
    if (referendum.proposal.type === 'Rfc') {
      return `https://github.com/polkadot-fellows/RFCs/pull/${referendum.proposal.pullRequest}`;
    }

    if (referendum.proposal.type === 'Unknown') {
      return referendum.proposal.description;
    }
  }

  return metadata?.description ?? null;
});

const $pendingReferendum = and($referendum.map(nullable), referendum.request.pending);
const $pendingReferendumMeta = and($referendumMeta.map(nullable), referendumMeta.request.pending);

const proposeEvidenceRequested = attachToFeatureInput(fellowshipReferendumsDetailsFeature, $proposer).filterMap(
  ({ input, data }) => {
    if (nullable(data)) return;

    return {
      api: input.api,
      palletType: input.palletType,
      chainId: input.chainId,
      accountId: data,
    };
  },
);

sample({
  clock: proposeEvidenceRequested,
  target: requestEvidenceFx,
});

export const details = {
  flow,

  $proposer,
  $proposerIdentity,
  $evidence,
  $description,
  $referendum,
  $referendumMeta,

  $pendingEvidence: requestEvidenceFx.pending,
  $pendingProposer: identity.request.pending,
  $pendingMeta: or($pendingReferendumMeta, fellowshipReferendumsDetailsFeature.isStarting),
  $pending: or($pendingReferendum, fellowshipReferendumsDetailsFeature.isStarting),
  $fulfilled: and(referendum.fulfilled, fellowshipReferendumsDetailsFeature.isRunning),
};
