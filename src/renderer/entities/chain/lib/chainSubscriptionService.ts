import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';
import { Event } from '@polkadot/types/interfaces';
import { Vec } from '@polkadot/types';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';

import { Params } from './common/types';

export const subscriptionService = {
  subscribeEvents,
};

function subscribeEvents(api: ApiPromise, params: Params, callback: (event: Event) => void): UnsubscribePromise {
  return api.query.system.events((events: Vec<FrameSystemEventRecord>) => {
    events.forEach(({ event }) => {
      const isDataMatched = params.data.every(
        (param, index) => !param || param.toString() === (event.data[index] || '').toString(),
      );

      if (
        (!params.method || params.method === event.method) &&
        (!params.section || params.section === event.section) &&
        isDataMatched
      ) {
        callback(event);
      }
    });
  });
}
