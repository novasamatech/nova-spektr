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

  map: (store, { params: { accounts, referendums, chainId, palletType }, result: response }) => {
    const result: Voting[] = [];
    for (const [index, vote] of response.entries()) {
      if (nullable(vote)) continue;
      const accountId = accounts.at(index);
      const referendumId = referendums.at(index);

      if (nullable(accountId) || nullable(referendumId)) continue;

      switch (vote.type) {
        case 'Aye':
          result.push({
            accountId,
            referendumId,
            aye: vote.data,
          });
          break;
        case 'Nay':
          result.push({
            accountId,
            referendumId,
            nay: vote.data,
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
