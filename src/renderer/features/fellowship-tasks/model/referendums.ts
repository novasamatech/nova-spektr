import { type ApiPromise } from '@polkadot/api';
import { createStore, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { attachToFeatureInput } from '@/shared/feature';
import { shallowEqual } from '@/shared/lib/utils';
import { type CollectivePalletsType, referendum, referendumService, track } from '@/domains/collectives';
import { type GovernanceApiSource, governanceMetaProvider } from '@/aggregates/governance-meta-provider';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';

const $referendums = fellowship.$store.map(store => store?.referendums ?? []);
const $metadata = fellowship.$store.map(store => store?.referendumMeta ?? []);
const $ongoing = $referendums.map(referendumService.getOngoingReferendums);
const $completed = $referendums.map(referendumService.getCompletedReferendums);

sample({
  clock: fellowshipTasksFeature.running,
  target: [track.request],
});

const $metadataRequestParams = createStore<{
  provider: GovernanceApiSource;
  api: ApiPromise;
  chainId: ChainId;
  palletType: CollectivePalletsType;
} | null>(null);

const metadataProviderUpdated = attachToFeatureInput(fellowshipTasksFeature, governanceMetaProvider.$metaProvider).map(
  ({ input: { chainId, palletType, api }, data: apiSource }) => ({
    provider: apiSource!.type,
    api,
    chainId,
    palletType,
  }),
);

sample({
  clock: metadataProviderUpdated,
  source: $metadataRequestParams,
  filter: (prev, next) => !shallowEqual(prev, next),
  fn: (_, next) => next,
  target: [$metadataRequestParams],
});

export const referendums = {
  $ongoing,
  $completed,
  $metadata,

  $pending: referendum.request.pending,
};
