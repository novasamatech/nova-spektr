import { type ApiPromise } from '@polkadot/api';
import { type UnitValue, combine, createStore } from 'effector';
import { readonly } from 'patronum';
import { z } from 'zod';

import { type ChainId, ExternalType } from '@/shared/core';
import { createDataSource, createDataSubscription } from '@/shared/effector';
import { merge, pickNestedValue, setNestedValue, toAccountId } from '@/shared/lib/utils';
import { type ReferendumId, referendaPallet } from '@/shared/pallet/referenda';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
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
  accounts: AccountId[];
};

const { subscribe: subscribeAccountsVoting, unsubscribe: unsubscribeAccountsVoting } = createDataSubscription<
  UnitValue<typeof $votes>,
  VotingSubscribeParams,
  Vote
>({
  initial: $votes,

  fn({ palletType, api, accounts }, callback) {
    const number = z.string().transform(v => parseInt(v));
    const eventSchema = z.object({
      who: z.string(),
      poll: number.transform(referendaPallet.helpers.toReferendumId),
      vote: z.object({ Aye: number }).or(z.object({ Nay: number })),
    });

    const unsubscribe = polkadotjsHelpers.subscribeSystemEvents(
      { api, section: `${palletType}Collective`, methods: ['Voted'] },
      event => {
        console.log(event);
        const data = eventSchema.parse(event.data.toHuman());
        const accountId = toAccountId(data.who);
        if (!accounts.some(a => a === accountId)) {
          return;
        }

        const vote: Vote = {
          accountId,
          referendumId: data.poll,
          decision: 'Aye' in data.vote ? 'Aye' : 'Nay',
          votes: 'Aye' in data.vote ? data.vote.Aye : data.vote.Nay,
        };

        callback({
          value: vote,
          done: true,
        });
      },
    );

    return unsubscribe;
  },

  map(store, { params: { chainId, palletType }, result: vote }) {
    const existingVotes = pickNestedValue(store, palletType, chainId) ?? [];
    const merged = merge({
      a: existingVotes,
      b: [vote],
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
