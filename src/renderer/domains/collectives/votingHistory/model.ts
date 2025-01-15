import { type ApiPromise } from '@polkadot/api';
import { type UnitValue, combine, createStore } from 'effector';
import { readonly } from 'patronum';

import { type ChainId, ExternalType } from '@/shared/core';
import { createDataSource, createDataSubscription } from '@/shared/effector';
import { merge, nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { requestFromChain, requestFromSubQuery } from './source';
import { type Vote } from './types';

type RequestVotesParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  referendumId: ReferendumId;
};

const $votes = createStore<CollectivesStruct<Vote[]>>({});
const $source = combine({
  chains: networkModel.$chains,
  apis: networkModel.$apis,
  votes: $votes,
});

const { fulfilled, pending, request } = createDataSource<
  UnitValue<typeof $source>,
  RequestVotesParams,
  Vote[],
  UnitValue<typeof $votes>
>({
  source: $source,
  target: $votes,
  fn: async ({ chainId, palletType, referendumId }, { apis, chains }) => {
    const api = apis[chainId];
    const chain = chains[chainId];

    if (api) {
      try {
        return await requestFromChain(api, palletType, referendumId);
      } catch {
        /* skip */
      }
    }

    if (!chain) return [];

    const externalApi = chain.externalApi?.[ExternalType.COLLECTIVES]?.at(0);
    const sourceUrl = externalApi?.url;

    if (!sourceUrl) return [];

    return requestFromSubQuery(sourceUrl, palletType, referendumId);
  },
  map({ votes }, { params, result }) {
    const existingVotes = pickNestedValue(votes, params.palletType, params.chainId) ?? [];
    const merged = merge({
      a: existingVotes,
      b: result,
      mergeBy: ({ referendumId, accountId }) => [referendumId, accountId],
    });

    return setNestedValue(votes, params.palletType, params.chainId, merged);
  },
});

type VotingSubscribeParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
  referendums: ReferendumId[];
  accounts: AccountId[];
};

const { subscribe: subscribeAccountsVoting, unsubscribe: unsubscribeAccountsVoting } = createDataSubscription<
  UnitValue<typeof $votes>,
  VotingSubscribeParams,
  Awaited<ReturnType<typeof collectivePallet.storage.voting>>
>({
  initial: $votes,

  fn({ palletType, api, accounts, referendums }, callback) {
    const keys = referendums.flatMap(referendum => accounts.map(account => [referendum, account] as const));

    return collectivePallet.storage.subscribeVoting(palletType, api, keys, value => {
      callback({ done: true, value });
    });
  },

  map(store, { params: { chainId, palletType }, result: response }) {
    const newVotes: Vote[] = [];
    for (const vote of response.values()) {
      if (nullable(vote.vote)) continue;

      newVotes.push({
        accountId: vote.key.accountId,
        referendumId: vote.key.referendumId,
        decision: vote.vote.type,
        votes: vote.vote.data,
      });
    }

    const existingVotes = pickNestedValue(store, palletType, chainId) ?? [];
    const merged = merge({
      a: existingVotes,
      b: newVotes,
      mergeBy: ({ referendumId, accountId }) => [referendumId, accountId],
    });

    return setNestedValue(store, palletType, chainId, merged);
  },
});

export const votingDomainModel = {
  $votes: readonly($votes),

  subscribeAccountsVoting,
  unsubscribeAccountsVoting,

  fulfilled,
  pending,
  request,
};
