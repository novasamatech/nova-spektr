import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { nullable } from '@/shared/lib/utils';
import { Duration } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { eraService } from '@/domains/staking';

type Props = {
  api: ApiPromise | null;
  timelineApi: ApiPromise | null;
  era: number;
  className?: string;
};

export const TimeToEra = ({ api, timelineApi, era, className }: Props) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (nullable(api) || nullable(timelineApi)) return;

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
    return <Skeleton width={10} height="10px" />;
  }

  return <Duration seconds={seconds.toString()} className={className} />;
};
