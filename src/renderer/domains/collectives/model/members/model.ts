import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createDataSubscription } from '@/shared/effector';
import { nonNullable, nullable, setNestedValue } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../../lib/types';

import { type CoreMember, type Member } from './types';

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
} = createDataSubscription<CollectivesStruct<(Member | CoreMember)[]>, RequestParams, (Member | CoreMember)[]>({
  initial: {},
  fn: ({ api, palletType }, callback) => {
    let abortController = new AbortController();

    const fn = async () => {
      abortController.abort();
      abortController = new AbortController();

      const collectiveMembers = await collectivePallet.storage.members(palletType, api);
      if (abortController.signal.aborted) return;

      const coreMembers = await collectiveCorePallet.storage.member(palletType, api);
      if (abortController.signal.aborted) return;

      const result: Member[] = [];

      for (const collectiveMember of collectiveMembers) {
        if (nullable(collectiveMember.member)) continue;

        const coreMember = coreMembers.find(member => member.account === collectiveMember.account);

        if (nonNullable(coreMember?.status)) {
          result.push({
            accountId: collectiveMember.account,
            rank: collectiveMember.member.rank,
            isActive: coreMember.status.isActive,
            lastPromotion: coreMember.status.lastPromotion,
            lastProof: coreMember.status.lastProof,
          } as CoreMember);
        } else {
          result.push({
            accountId: collectiveMember.account,
            rank: collectiveMember.member.rank,
          });
        }
      }

      callback({
        done: true,
        value: result,
      });
    };

    fn();

    // TODO check if section name is correct
    return polkadotjsHelpers.subscribeSystemEvents({ api, section: `${palletType}Core` }, fn).then(fn => () => {
      abortController.abort();
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
