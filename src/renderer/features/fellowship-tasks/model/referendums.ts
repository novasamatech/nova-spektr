import { sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable } from '@/shared/lib/utils';
import { referendum, referendumMeta, referendumService, track } from '@/domains/collectives';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';

const $referendums = fellowship.$store.map(store => store?.referendums ?? []);
const $metadata = fellowship.$store.map(store => store?.referendumMeta ?? {});
const $ongoing = $referendums.map(referendumService.getOngoingReferendums);
const $completed = $referendums.map(referendumService.getCompletedReferendums);

sample({
  clock: fellowshipTasksFeature.running,
  target: [track.request],
});

sample({
  clock: fellowshipTasksFeature.running,
  target: referendum.subscribe,
});

sample({
  clock: fellowshipTasksFeature.stopped,
  target: referendum.unsubscribe,
});

const metadataProviderUpdated = attachToFeatureInput(fellowshipTasksFeature, governanceMetaProvider.$metaProvider);

sample({
  clock: metadataProviderUpdated,
  filter({ data }) {
    return nonNullable(data);
  },
  fn: ({ input: { chainId, palletType, api }, data: apiSource }) => ({
    provider: apiSource!.type,
    api,
    chainId,
    palletType,
  }),
  target: referendumMeta.request,
});

export const referendums = {
  $ongoing,
  $completed,
  $metadata,
  pending: referendum.request.pending,
};
