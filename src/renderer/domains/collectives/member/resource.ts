import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { createSubscriptionResource } from '@/shared/resource2';
import { mergeNested } from '../_lib/helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type CoreMember, type Member } from './types';

type RequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
};

export const $cache = createStore<CollectivesStruct<Member[]>>({});

export const membersSubscription = createSubscriptionResource<RequestParams, Member[], CollectivesStruct<Member[]>>({
  cache: $cache,
  key({ api, palletType }) {
    return `${api.genesisHash.toHex()}:${palletType}`;
  },
  map(store, members) {
    return mergeNested(
      store,
      members,
      m => m.accountId,
      (a, b) => b.rank - a.rank,
    );
  },
  fn({ api, palletType }, callback) {
    const fn = async () => {
      const collectiveMembers = await collectivePallet.storage.members(palletType, api);
      const coreMembers = await collectiveCorePallet.storage.member(palletType, api);
      const result: (Member | CoreMember)[] = [];

      for (const collectiveMember of collectiveMembers) {
        if (nullable(collectiveMember.member)) continue;

        const coreMember = coreMembers.find(member => member.account === collectiveMember.account);

        if (nonNullable(coreMember?.status)) {
          result.push({
            pallet: palletType,
            chainId: api.genesisHash.toHex(),
            accountId: collectiveMember.account,
            rank: collectiveMember.member.rank,
            isActive: coreMember.status.isActive,
            lastPromotion: coreMember.status.lastPromotion,
            lastProof: coreMember.status.lastProof,
          });
        } else {
          result.push({
            pallet: palletType,
            chainId: api.genesisHash.toHex(),
            accountId: collectiveMember.account,
            rank: collectiveMember.member.rank,
          });
        }
      }

      callback(result);
    };

    fn();

    const unsubscribe = Promise.all([
      polkadotjsHelpers.subscribeSystemEvents(
        {
          api,
          section: `${palletType}Collective`,
          methods: ['MemberAdded', 'MemberExchanged', 'MemberRemoved', 'RankChanged'],
        },
        fn,
      ),
      polkadotjsHelpers.subscribeSystemEvents(
        { api, section: `${palletType}Core`, methods: ['Imported', 'Swapped', 'Promoted', 'Demoted', 'ActiveChanged'] },
        fn,
      ),
    ]);

    return () => {
      unsubscribe.then(fns => () => {
        for (const fn of fns) {
          fn();
        }
      });
    };
  },
});
