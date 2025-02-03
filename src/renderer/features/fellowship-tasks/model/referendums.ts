import { sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable } from '@/shared/lib/utils';
import { referendumMeta, referendumService, referendums } from '@/domains/collectives';
import { governanceModel } from '@/entities/governance';

import { fellowshipTasksFeature } from './feature';
import { fellowshipModel } from './fellowship';

// TODO do smth about it, this connection looks terrible
const metadataProviderUpdated = attachToFeatureInput(fellowshipTasksFeature, governanceModel.$governanceApi);

sample({
  clock: metadataProviderUpdated,
  filter: ({ data }) => nonNullable(data),
  fn: ({ input: { chainId, palletType }, data: api }) => ({
    provider: api!.type,
    chainId,
    palletType,
  }),
  target: referendumMeta.request,
});

sample({
  clock: fellowshipTasksFeature.running,
  target: [referendums.subscribe, referendumMeta.request],
});

sample({
  clock: fellowshipTasksFeature.stopped,
  target: referendums.unsubscribe,
});

const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $meta = fellowshipModel.$store.map(store => store?.referendumMeta ?? {});

const $ongoing = $referendums.map(referendumService.getOngoingReferendums);

export const referendumListModel = {
  $referendums,
  $ongoing,
  $meta,
  $pending: or(referendums.pending, fellowshipTasksFeature.isStarting),
  $fulfilled: and(referendums.fulfilled, fellowshipTasksFeature.isRunning),
};
