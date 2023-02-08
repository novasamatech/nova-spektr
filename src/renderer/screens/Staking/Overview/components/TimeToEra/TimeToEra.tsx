import cn from 'classnames';
import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Duration, Shimmering } from '@renderer/components/ui';
import { useEra } from '@renderer/services/staking/eraService';

interface Props {
  era?: number;
  currentEra?: number;
  className?: string;
  api?: ApiPromise;
}

const TimeToEra = ({ api, era, className }: Props) => {
  const { getTimeToEra } = useEra();

  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    if (!api) return;

    (async () => {
      const seconds = await getTimeToEra(api, era);
      setSeconds(seconds);
    })();
  }, [era, api]);

  useEffect(() => {
    if (seconds > 0) {
      const timer = setTimeout(() => setSeconds(seconds - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [seconds]);

  if (seconds <= 0) {
    return <Shimmering width={40} height={10} />;
  }

  return <Duration seconds={seconds.toString()} className={cn(className)} />;
};

export default TimeToEra;
