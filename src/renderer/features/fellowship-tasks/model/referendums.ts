import { sample } from 'effector';
import { and, or } from 'patronum';

import { referendumService, referendums } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowshipModel } from './fellowship';

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
