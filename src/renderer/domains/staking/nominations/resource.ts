import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createSubscriptionResource } from '@/shared/query';

import { nominationsService } from './service';
import { type NominationsMap, type PayeeMap } from './types';

export type NominationsResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  stashes: AccountId[];
};

export type PayeeResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  stashes: AccountId[];
  addressPrefix: number;
};

export type MinBondResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
};

const $nominationsCache = createStore<Record<ChainId, NominationsMap>>({});
const $payeeCache = createStore<Record<ChainId, PayeeMap>>({});
const $minBondCache = createStore<Record<ChainId, string>>({});

export const nominationsResource = createSubscriptionResource<NominationsResourceParams>({
  key: ({ chainId, stashes }) => [chainId, stashes.join('_')],
})
  .subscribe<NominationsMap>(({ api, stashes }, callback) => {
    return nominationsService.subscribeNominations(api, stashes, callback);
  })
  .cache({
    store: $nominationsCache,
    map: (state, nominations, { chainId }) => ({
      ...state,
      [chainId]: { ...state[chainId], ...nominations },
    }),
  })
  .build();

export const payeeResource = createSubscriptionResource<PayeeResourceParams>({
  key: ({ chainId, stashes }) => [chainId, stashes.join('_')],
})
  .subscribe<PayeeMap>(({ api, stashes, addressPrefix }, callback) => {
    return nominationsService.subscribePayee(api, stashes, callback, addressPrefix);
  })
  .cache({
    store: $payeeCache,
    map: (state, payee, { chainId }) => ({
      ...state,
      [chainId]: { ...state[chainId], ...payee },
    }),
  })
  .build();

export const minBondResource = createSubscriptionResource<MinBondResourceParams>({
  key: ({ chainId }) => [chainId],
})
  .subscribe<string>(({ api }, callback) => {
    return nominationsService.subscribeMinNominatorBond(api, callback);
  })
  .cache({
    store: $minBondCache,
    map: (state, minBond, { chainId }) => ({ ...state, [chainId]: minBond }),
  })
  .build();
