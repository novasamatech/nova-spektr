import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Duration } from '@/shared/ui';
import { useStakingData } from '../../api';

type Props = {
  api?: ApiPromise;
  timelineApi?: ApiPromise;
  className?: string;
};

export const UnstakingDuration = ({ api, timelineApi, className }: Props) => {
  const { getUnbondingPeriod } = useStakingData();

  const [unstakingPeriod, setUnstakingPeriod] = useState('...');

  useEffect(() => {
    if (!api || !timelineApi) return;

    setUnstakingPeriod(getUnbondingPeriod(api, timelineApi));

    return () => {
      setUnstakingPeriod('');
    };
  }, [api]);

  return <Duration className={className} seconds={unstakingPeriod} />;
};
