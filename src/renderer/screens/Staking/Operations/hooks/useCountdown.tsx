import { useEffect, useState } from 'react';
import { BN, BN_THOUSAND } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';

import { DEFAULT_QR_LIFETIME } from '@renderer/shared/utils/constants';
import { getExpectedBlockTime } from '@renderer/shared/utils/substrate';

export function useCountdown(api?: ApiPromise): [number, () => void] {
  const [countdown, setCountdown] = useState(DEFAULT_QR_LIFETIME);

  const resetCountdown = () => {
    if (!api) return;

    const expectedBlockTime = getExpectedBlockTime(api);

    setCountdown(expectedBlockTime.mul(new BN(DEFAULT_QR_LIFETIME)).div(BN_THOUSAND).toNumber() || 0);
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [countdown]);

  return [countdown, resetCountdown];
}
