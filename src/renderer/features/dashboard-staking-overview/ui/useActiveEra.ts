import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { type EraIndex } from '@/shared/core';
import { eraService } from '@/entities/staking';

export function useActiveEra(api: ApiPromise | null): EraIndex | undefined {
  const [era, setEra] = useState<EraIndex | undefined>();

  useEffect(() => {
    if (!api) {
      setEra(undefined);

      return;
    }

    let unsub: (() => void) | undefined;

    eraService.subscribeActiveEra(api, setEra).then((fn) => {
      unsub = fn;
    });

    return () => {
      unsub?.();
    };
  }, [api]);

  return era;
}
