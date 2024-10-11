import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createDataSubscription } from '@/shared/effector';
import { nullable, setNestedValue } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../../lib/types';

import { type Member } from './types';

export type RequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
};

const {
  $: $list,
  pending,
  subscribe,
  unsubscribe,
  fulfilled,
  received,
} = createDataSubscription<CollectivesStruct<Member[]>, RequestParams, Member[]>({
  initial: {},
  fn: ({ api, palletType }, callback) => {
    let currentAbortController = new AbortController();

    const fn = async () => {
      currentAbortController.abort();
      currentAbortController = new AbortController();

      const collectiveMembers = await collectivePallet.storage.members(palletType, api);
      if (currentAbortController.signal.aborted) return;

      const coreMembers = await collectiveCorePallet.storage.member(palletType, api);
      if (currentAbortController.signal.aborted) return;

      const result: Member[] = [];

      for (const collectiveMember of collectiveMembers) {
        if (nullable(collectiveMember.member)) continue;

        const coreMember = coreMembers.find(x => x.account === collectiveMember.account);
        if (nullable(coreMember) || nullable(coreMember.status)) continue;

        result.push({
          accountId: collectiveMember.account,
          rank: collectiveMember.member.rank,
          isActive: coreMember.status.isActive,
          lastPromotion: coreMember.status.lastPromotion,
          lastProof: coreMember.status.lastProof,
        });
      }

      callback({
        done: true,
        value: result,
      });
    };

    fn();

    // TODO check if section name is correct
    return polkadotjsHelpers.subscribeSystemEvents({ api, section: `${palletType}Core` }, fn).then(fn => () => {
      currentAbortController.abort();
      fn();
    });
  },
  map: (store, { params, result }) => {
    return setNestedValue(
      store,
      params.palletType,
      params.chainId,
      result.sort((a, b) => b.rank - a.rank),
    );
  },
});

export const membersDomainModel = {
  $list,

  pending,
  subscribe,
  unsubscribe,
  fulfilled,
  received,
};
