import { useEffect, useState } from 'react';
import { ApiPromise } from '@polkadot/api';

import { ValidatorMap, useEra, useValidators } from './';
import { ChainId } from '@renderer/shared/core';

export const useValidatorsMap = (api?: ApiPromise, chainId?: ChainId, isLightClient?: boolean): ValidatorMap => {
  const { subscribeActiveEra } = useEra();
  const { getValidatorsWithInfo } = useValidators();

  const [era, setEra] = useState<number>();
  const [validators, setValidators] = useState<ValidatorMap>({});

  useEffect(() => {
    let unsubEra: () => void | undefined;

    if (api) {
      (async () => {
        unsubEra = await subscribeActiveEra(api, setEra);
      })();
    }

    return () => {
      api && unsubEra?.();
    };
  }, []);

  useEffect(() => {
    if (!era || !chainId || !api) return;

    getValidatorsWithInfo(chainId, api, era, isLightClient).then((validators) => {
      setValidators(validators);
    });
  }, [era]);

  return validators;
};
