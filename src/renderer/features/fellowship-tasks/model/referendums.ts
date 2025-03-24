import { attach, createEvent, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { evidence, referendum, referendumMeta, referendumService, track } from '@/domains/collectives';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';

const requestEvidence = createEvent<AccountId>();
const requestEvidenceFx = attach({ effect: evidence.request });

const $referendums = fellowship.$store.map(store => store?.referendums ?? []);
const $metadata = fellowship.$store.map(store => store?.referendumMeta ?? {});
const $ongoing = $referendums.map(referendumService.getOngoingReferendums);
const $completed = $referendums.map(referendumService.getCompletedReferendums);

sample({
  clock: fellowshipTasksFeature.running,
  target: [track.request],
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, requestEvidence),
  fn({ input, data: accountId }) {
    return {
      palletType: input.palletType,
      api: input.api,
      chain: input.chain,
      accountId,
    };
  },
  target: requestEvidenceFx,
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
  fn: ({ input: { chainId, palletType }, data: api }) => ({
    provider: api!.type,
    chainId,
    palletType,
  }),
  target: referendumMeta.request,
});

export const referendums = {
  $ongoing,
  $completed,
  $metadata,
  $evidencePending: requestEvidenceFx.pending,

  pending: referendum.pending,
  requestEvidence,
};
