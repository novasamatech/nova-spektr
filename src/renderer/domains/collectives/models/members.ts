import { createEffect } from 'effector';

import { collectivePallet } from '@/shared/pallet/collective';
import { type Member, type RequestCollectiveParams } from '../lib/types';

const requestMembersFx = createEffect(({ api, palletType }: RequestCollectiveParams): Promise<Member[]> => {
  return collectivePallet.storage.members(palletType, api);
});

export const membersModal = {
  $isLoading: requestMembersFx.pending,

  events: {
    requestDone: requestMembersFx.done,
  },

  effects: {
    requestMembersFx,
  },
};
