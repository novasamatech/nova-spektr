import { sample } from 'effector';
import { and, or } from 'patronum';

import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { referendumsDetailsFeatureStatus } from './status';

sample({
  clock: referendumsDetailsFeatureStatus.running,
  target: collectiveDomain.referendum.subscribe,
});

sample({
  clock: referendumsDetailsFeatureStatus.stopped,
  target: collectiveDomain.referendum.unsubscribe,
});

const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $meta = fellowshipModel.$store.map(store => store?.referendumMeta ?? {});

export const referendumListModel = {
  $referendums,
  $meta,
  $pending: or(collectiveDomain.referendum.pending, referendumsDetailsFeatureStatus.isStarting),
  $fulfulled: and(collectiveDomain.referendum.fulfilled, referendumsDetailsFeatureStatus.isRunning),
};
