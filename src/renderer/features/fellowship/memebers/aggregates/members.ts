import { combine, createEvent, sample } from 'effector';
import { or } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';
import { type RequestCollectiveParams } from '@/domains/collectives/lib/types';
import { membersModal } from '@/domains/collectives/models/members';
import { fellowshipNetworkAggregate } from '../../network/aggregates/fellowshipNetwork';

const requestMembers = createEvent<RequestCollectiveParams | null>();

const $members = combine(fellowshipNetworkAggregate.$selectedCollectiveData, (collective) => {
  if (!collective) return [];

  return collective.members ?? [];
});

sample({
  clock: fellowshipNetworkAggregate.$palletInfo,
  target: requestMembers,
});

sample({
  clock: requestMembers,
  filter: (palletInfo) => nonNullable(palletInfo),
  fn: (palletInfo) => {
    return {
      palletType: palletInfo!.palletType,
      api: palletInfo!.api,
      chainId: palletInfo!.chainId,
    };
  },
  target: membersModal.effects.requestMembersFx,
});

export const membersAggregate = {
  $members,
  $isLoading: or(membersModal.$isLoading, fellowshipNetworkAggregate.$isConnecting),

  events: {
    requestMembers,
  },
};
