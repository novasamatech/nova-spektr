import { sample } from 'effector';
import { and, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable } from '@/shared/lib/utils';
import { referendum, referendumMeta, referendumService } from '@/domains/collectives';
import { governanceModel } from '@/entities/governance';

import { fellowshipReferendumsFeature } from './feature';
import { fellowshipModel } from './fellowship';

// TODO do smth about it, this connection looks terrible
const metadataProviderUpdated = attachToFeatureInput(fellowshipReferendumsFeature, governanceModel.$governanceApi);

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
  clock: fellowshipReferendumsFeature.running,
  target: [referendum.subscribe, referendumMeta.request],
});

sample({
  clock: fellowshipReferendumsFeature.stopped,
  target: referendum.unsubscribe,
});

const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $meta = fellowshipModel.$store.map(store => store?.referendumMeta ?? {});

const $ongoing = $referendums.map(referendumService.getOngoingReferendums);
const $completed = $referendums.map(referendumService.getCompletedReferendums);

export const referendumListModel = {
  $referendums,
  $ongoing,
  $completed,
  $meta,
  $pending: or(referendum.pending, fellowshipReferendumsFeature.isStarting),
  $fulfilled: and(referendum.fulfilled, fellowshipReferendumsFeature.isRunning),
};
