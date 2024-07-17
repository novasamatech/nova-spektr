import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';
import { type Event } from '@polkadot/types/interfaces';
import { type Vec } from '@polkadot/types';
import { type FrameSystemEventRecord } from '@polkadot/types/lookup';

type Params = {
  method?: string;
  section?: string;
  data: any[];
};

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
