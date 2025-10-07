import { attach, combine, sample } from 'effector';
import { and, or } from 'patronum';

import { createFlow } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { dictionary, nonNullable, nullable } from '@/shared/lib/utils';
import {
  type Referendum,
  evidence,
  referendum,
  referendumMeta,
  referendumService,
  rfcDetails,
} from '@/domains/collectives';
import { identity } from '@/domains/network';

import { fellowshipReferendumsDetailsFeature } from './feature';
import { fellowship } from './fellowship';

const requestEvidenceFx = attach({ effect: evidence.requestContent });
const requestRfcFx = attach({ effect: rfcDetails.request });

const flow = createFlow<{ referendum: Referendum | null }>({ referendum: null });

const $referendum = flow.state.map(state => state.referendum);

const $evidenceContents = fellowship.$store.map(store => store?.evidenceContent ?? []);
const $members = fellowship.$store.map(store => dictionary(store?.members ?? [], 'accountId'));
const $meta = fellowship.$store.map(store => store?.referendumMeta ?? {});

const $identities = combine(identity.$list, fellowshipReferendumsDetailsFeature.input, (identities, input) => {
  if (nullable(input)) return {};
  return identities[input.chainId] ?? {};
});

const $referendumMeta = combine($meta, $referendum, (meta, referendum) => {
  if (nullable(referendum)) return null;

  return meta[referendum.id] ?? null;
});

const $proposer = $referendum.map(referendum => {
  if (nullable(referendum)) return null;
  return referendumService.getProposer(referendum);
});

const $proposerIdentity = combine($identities, $proposer, (identities, proposer) => {
  if (nullable(proposer)) return null;

  return identities[proposer] ?? null;
});

const $evidenceContent = combine(
  { referendum: $referendum, evidences: $evidenceContents, proposer: $proposer },
  ({ referendum, evidences, proposer }) => {
    if (nullable(referendum)) return null;

    return evidences.find(x => x.accountId === proposer) ?? null;
  },
);

const $description = combine({ referendum: $referendum, metadata: $referendumMeta }, ({ referendum, metadata }) => {
  if (nullable(referendum)) return null;

  if (referendumService.isOngoing(referendum) && referendum.proposal) {
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
    console.log('penis requested', { input, data });
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
  source: { referendum: $referendum, meta: $referendumMeta },
  fn: ({ referendum, meta }, input) => {
    if (nonNullable(referendum) && referendumService.isCompleted(referendum) && nonNullable(meta)) {
      return {
        ...input,
        blockHash: meta.blockHash,
      };
    }
    return input;
  },
  target: requestEvidenceFx,
});

const rfcSummaryRequested = attachToFeatureInput(fellowshipReferendumsDetailsFeature, $referendum).filterMap(
  ({ input, data: referendum }) => {
    if (
      nullable(referendum) ||
      !referendumService.isOngoing(referendum) ||
      !referendum.proposal ||
      !referendumService.isRfcProposal(referendum.proposal)
    ) {
      return;
    }

    return {
      palletType: input.palletType,
      prNumber: referendum.proposal.pullRequest,
      chainId: input.chainId,
    };
  },
);

sample({
  clock: rfcSummaryRequested,
  target: requestRfcFx,
});

export const details = {
  flow,

  $proposer,
  $proposerIdentity,
  $evidenceContent,
  $description,
  $referendum,
  $referendumMeta,
  $members,
  $identities,

  $pendingEvidence: requestEvidenceFx.pending,
  $pendingProposer: identity.request.pending,
  $pendingMeta: or($pendingReferendumMeta, fellowshipReferendumsDetailsFeature.isStarting),
  $pending: or($pendingReferendum, fellowshipReferendumsDetailsFeature.isStarting),
  $fulfilled: and(referendum.fulfilled, fellowshipReferendumsDetailsFeature.isRunning),
};
