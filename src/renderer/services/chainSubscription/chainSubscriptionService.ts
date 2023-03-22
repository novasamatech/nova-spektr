import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';
import { Event } from '@polkadot/types/interfaces';

import { IChainSubscriptionService, Params } from './common/types';

export const useChainSubscriptionService = (): IChainSubscriptionService => {
  const subscribeEvents = (api: ApiPromise, params: Params, callback: (event: Event) => void): UnsubscribePromise => {
    return api.query.system.events((events) => {
      events.forEach(({ event }) => {
        if (
          (!params.method || params.method === event.method) &&
          (!params.section || params.section === event.section) &&
          params.data.every((param, index) => !param || param.toString() === event.data[index].toString())
        ) {
          callback(event);
        }
      });
    });
  };

  return {
    subscribeEvents,
  };
};
