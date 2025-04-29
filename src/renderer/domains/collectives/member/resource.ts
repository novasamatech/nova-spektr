import { capitalize } from 'lodash';

import { type ChainId } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { papiHelpers } from '@/shared/papi-helpers';
import { createSubscriptionResource } from '@/shared/resource';
import { getChainRegistry } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';

import { type CoreMember, type Member } from './types';

type RequestParams = {
  chainId: ChainId;
  palletType: CollectivePalletsType;
};

export const membersSubscription = createSubscriptionResource<RequestParams, Member[]>({
  pool: ({ chainId, palletType }) => `${chainId}:${palletType}`,
  fn({ chainId, palletType }, callback) {
    const papi = getChainRegistry().getApi(chainId);

    const fn = async () => {
      const collectiveMembers = await collectivePallet.storage.members(palletType, papi);
      const coreMembers = await collectiveCorePallet.storage.member(palletType, papi);
      const result: (Member | CoreMember)[] = [];

      for (const collectiveMember of collectiveMembers) {
        if (nullable(collectiveMember.member)) continue;

        const coreMember = coreMembers.find(member => member.account === collectiveMember.account);

        if (nonNullable(coreMember?.status)) {
          result.push({
            chainId,
            pallet: palletType,
            accountId: collectiveMember.account,
            rank: collectiveMember.member.rank,
            isActive: coreMember.status.isActive,
            lastPromotion: coreMember.status.lastPromotion,
            lastProof: coreMember.status.lastProof,
          });
        } else {
          result.push({
            chainId,
            pallet: palletType,
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

    const unsubscribe = papiHelpers.getTypedApis(papi, ['dot_col'], ({ api }) => {
      const palletCollective = `${capitalize(palletType)}Collective` as const;
      const palletCore = `${capitalize(palletType)}Core` as const;

      return [
        api.event[palletCollective].MemberAdded.watch().subscribe(fn),
        api.event[palletCollective].MemberRemoved.watch().subscribe(fn),
        api.event[palletCollective].MemberExchanged.watch().subscribe(fn),
        api.event[palletCollective].RankChanged.watch().subscribe(fn),
        api.event[palletCore].Imported.watch().subscribe(fn),
        api.event[palletCore].Swapped.watch().subscribe(fn),
        api.event[palletCore].Promoted.watch().subscribe(fn),
        api.event[palletCore].Demoted.watch().subscribe(fn),
        api.event[palletCore].ActiveChanged.watch().subscribe(fn),
      ];
    });

    return () => {
      for (const fn of unsubscribe) {
        fn();
      }
    };
  },
});
