import { useEffect, useState } from 'react';
import { ApiPromise } from '@polkadot/api';

import { ValidatorMap } from './types';
import { validatorsService, eraService } from '../api';

export const useValidatorsMap = (api?: ApiPromise, isLightClient?: boolean): ValidatorMap => {
  const [era, setEra] = useState<number>();
  const [validators, setValidators] = useState<ValidatorMap>({});

  useEffect(() => {
    let unsubEra: () => void | undefined;

    if (api?.query.staking?.activeEra) {
      eraService.subscribeActiveEra(api, setEra).then((unsubFn) => (unsubEra = unsubFn));
    }

    return () => {
      api && unsubEra?.();
    };
  }, []);

  useEffect(() => {
    if (!era || !api) return;

    validatorsService.getValidatorsWithInfo(api, era, isLightClient).then(setValidators);
  }, [era]);

  return validators;
};
