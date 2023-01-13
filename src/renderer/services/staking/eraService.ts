import { ApiPromise } from '@polkadot/api';

import { EraIndex } from '@renderer/domain/shared-kernel';
import { IEraService } from './common/types';

export const useEra = (): IEraService => {
  const subscribeActiveEra = (api: ApiPromise, callback: (era?: EraIndex) => void): Promise<() => void> => {
    return api.query.staking.activeEra((data: any) => {
      try {
        const unwrappedData = data.unwrap();
        callback(unwrappedData.get('index').toNumber());
      } catch (error) {
        console.warn(error);
        callback(undefined);
      }
    });
  };

  return {
    subscribeActiveEra,
  };
};
