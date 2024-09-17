import { createEvent, sample } from 'effector';
import { or } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';
import { type RequestCollectiveParams } from '@/domains/collectives/lib/types';
import { fellowshipNetworkModel } from '@/features/fellowship/network';

import { collectiveModel } from './collective';

// const enabled = createGate();

const requestMembers = createEvent<RequestCollectiveParams | null>();

const $members = collectiveModel.$store.map(x => x?.members ?? []);

// sample({
//   clock: [enabled.open, fellowshipNetworkModel.$palletInfo],
//   source: fellowshipNetworkModel.$palletInfo,
// })

sample({
  clock: fellowshipNetworkModel.$palletInfo,
  target: requestMembers,
});

sample({
  clock: requestMembers,
  filter: nonNullable,
  fn: palletInfo => ({
    palletType: palletInfo!.palletType,
    api: palletInfo!.api,
    chainId: palletInfo!.chainId,
  }),
  target: collectiveDomain.members.subscribe,
});

export const membersModel = {
  $members,
  $isLoading: or(collectiveDomain.members.pending, fellowshipNetworkModel.$isConnecting),

  events: {
    requestMembers,
  },
};
