import { combine, createEvent, sample } from 'effector';
import { or } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';
import { type RequestCollectiveParams } from '@/domains/collectives/lib/types';
import { membersDomainModel } from '@/domains/collectives/models/members';
import { fellowshipNetworkModel } from '../../network/model/fellowshipNetwork';

const requestMembers = createEvent<RequestCollectiveParams | null>();

const $members = combine(fellowshipNetworkModel.$selectedCollectiveData, (collective) => {
  if (!collective) return [];

  return collective.members ?? [];
});

sample({
  clock: fellowshipNetworkModel.$palletInfo,
  target: requestMembers,
});

sample({
  clock: requestMembers,
  filter: (palletInfo) => nonNullable(palletInfo),
  fn: (palletInfo) => ({
    palletType: palletInfo!.palletType,
    api: palletInfo!.api,
    chainId: palletInfo!.chainId,
  }),
  target: membersDomainModel.requestMembers,
});

export const membersModel = {
  $members,
  $isLoading: or(membersDomainModel.pending, fellowshipNetworkModel.$isConnecting),

  events: {
    requestMembers,
  },
};
