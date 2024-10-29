import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createDataSubscription } from '@/shared/effector';
import { nullable, setNestedValue } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType, type CollectivesStruct } from '../../lib/types';

import { type Voting } from './types';

type VotingParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
  referendums: ReferendumId[];
  accounts: AccountId[];
};

const {
  $: $list,
  subscribe,
  unsubscribe,
  pending,
} = createDataSubscription<
  CollectivesStruct<Voting[]>,
  VotingParams,
  Awaited<ReturnType<typeof collectivePallet.storage.voting>>
>({
  initial: {},

  fn: ({ palletType, api, accounts, referendums }, callback) => {
    const keys = referendums.flatMap(referendum => accounts.map(account => [referendum, account] as const));

    return collectivePallet.storage.subscribeVoting(palletType, api, keys, value => {
      callback({ done: true, value });
    });
  },

  map: (store, { params: { chainId, palletType }, result: response }) => {
    const result: Voting[] = [];
    for (const vote of response.values()) {
      if (nullable(vote)) continue;

      switch (vote.vote?.type) {
        case 'Aye':
          result.push({
            accountId: vote.key.accountId,
            referendumId: vote.key.referendumId,
            aye: vote.vote.data,
          });
          break;
        case 'Nay':
          result.push({
            accountId: vote.key.accountId,
            referendumId: vote.key.referendumId,
            nay: vote.vote.data,
          });
          break;
      }
    }

    return setNestedValue(store, palletType, chainId, result);
  },
});

export const votingDomainModel = {
  $list,
  pending,
  subscribe,
  unsubscribe,
};
