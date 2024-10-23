import { combine } from 'effector';
import { createGate } from 'effector-react';
import { and, or } from 'patronum';

import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { collectiveDomain } from '@/domains/collectives';
import { identityDomain } from '@/domains/identity';

import { fellowshipModel } from './fellowship';
import { referendumsDetailsFeatureStatus } from './status';

const gate = createGate<{ referendumId: ReferendumId | null }>({ defaultState: { referendumId: null } });

const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $meta = fellowshipModel.$store.map(store => store?.referendumMeta ?? {});

const $referendum = combine($referendums, gate.state, (referendums, { referendumId }) => {
  if (referendums.length === 0 || referendumId === null) return null;

  return referendums.find(referendum => referendum.id === referendumId) ?? null;
});

const $identities = combine(
  identityDomain.identity.$list,
  referendumsDetailsFeatureStatus.input,
  (identities, input) => {
    if (nullable(input)) return {};

    return identities[input.chainId] ?? {};
  },
);

const $referendumMeta = combine($meta, gate.state, (meta, { referendumId }) => {
  if (referendumId === null) return null;

  return meta[referendumId] ?? null;
});

const $proposer = $referendum.map(referendum => {
  if (nullable(referendum) || collectiveDomain.referendumService.isKilled(referendum)) return null;

  return referendum.submissionDeposit?.who ?? null;
});

const $proposerIdentity = combine($identities, $proposer, (identities, proposer) => {
  if (nullable(proposer)) return null;

  return identities[proposer] ?? null;
});

const $pendingReferendum = and($referendum.map(nullable), collectiveDomain.referendum.pending);
const $pendingReferendumMeta = and($referendumMeta.map(nullable), collectiveDomain.referendumMeta.pending);

export const referendumDetailsModel = {
  gate,

  $proposer,
  $proposerIdentity,
  $referendum,
  $referendumMeta,

  $pendingProposer: identityDomain.identity.pending,
  $pendingMeta: or($pendingReferendumMeta, referendumsDetailsFeatureStatus.isStarting),
  $pending: or($pendingReferendum, referendumsDetailsFeatureStatus.isStarting),
  $fulfilled: and(collectiveDomain.referendum.fulfilled, referendumsDetailsFeatureStatus.isRunning),
};
