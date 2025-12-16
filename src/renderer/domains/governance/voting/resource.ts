import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type TrackId, type VotingMap } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createSubscriptionResource } from '@/shared/query';
import { governanceSubscribeService } from '@/entities/governance';

export type VotingSubscriptionParams = {
  api: ApiPromise;
  tracks: TrackId[];
  accounts: AccountId[];
};

const $sharedVotingCache = createStore<Record<ChainId, VotingMap>>({});

export const subscriptionResource = createSubscriptionResource<VotingSubscriptionParams>({
  key: ({ api, accounts }) => [api.genesisHash.toHex(), accounts.join('-fuck-')],
})
  .subscribe<VotingMap>(({ api, tracks, accounts }, callback) => {
    return governanceSubscribeService.subscribeVotingFor(api, tracks, accounts, callback);
  })
  .cache({
    store: $sharedVotingCache,
    map: (state, voting, { api }) => {
      const chainId = api.genesisHash.toHex();
      const prev = state[chainId] ?? {};

      return { ...state, [chainId]: { ...prev, ...voting } };
    },
  })
  .build();
