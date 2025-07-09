import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Duration, Shimmering } from '@/shared/ui';
import { eraService } from '@/entities/staking';

type Props = {
  api: ApiPromise;
  timelineApi: ApiPromise;
  era: number;
  className?: string;
};

export const TimeToEra = ({ api, timelineApi, era, className }: Props) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!api) return;

    eraService.getTimeToEra(api, timelineApi, era).then(setSeconds);
  }, [era, api]);

  useEffect(() => {
    if (seconds > 0) {
      const timer = setTimeout(() => setSeconds((seconds) => seconds - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [seconds]);

  if (seconds <= 0) {
    return <Shimmering width={40} height={10} className={className} />;
  }

  return <Duration seconds={seconds.toString()} className={className} />;
};
