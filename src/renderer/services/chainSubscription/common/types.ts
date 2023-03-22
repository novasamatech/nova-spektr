import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';
import { Event } from '@polkadot/types/interfaces';

export type Params = {
  method?: string;
  section?: string;
  data: any[];
};

export interface IChainSubscriptionService {
  subscribeEvents: (api: ApiPromise, params: Params, callback: (event: Event) => void) => UnsubscribePromise;
}
