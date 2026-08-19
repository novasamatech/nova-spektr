import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createSubscriptionResource } from '@/shared/query';

import { validatorPrefsService } from './service';
import { type ValidatorPrefsMap } from './types';

export type ValidatorPrefsResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  stashes: AccountId[];
};

const $validatorPrefsCache = createStore<Record<ChainId, ValidatorPrefsMap>>({});

export const validatorPrefsResource = createSubscriptionResource<ValidatorPrefsResourceParams>({
  key: ({ chainId, stashes }) => [chainId, stashes.join('_')],
})
  .subscribe<ValidatorPrefsMap>(({ api, stashes }, callback) => {
    return validatorPrefsService.subscribeValidatorPrefs(api, stashes, callback);
  })
  .cache({
    store: $validatorPrefsCache,
    map: (state, prefs, { chainId }) => ({
      ...state,
      [chainId]: { ...state[chainId], ...prefs },
    }),
  })
  .build();
