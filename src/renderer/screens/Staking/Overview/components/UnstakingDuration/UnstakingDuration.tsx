import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Duration } from '@renderer/components/ui';
import { useStakingData } from '@renderer/services/staking/stakingDataService';

type Props = {
  api?: ApiPromise;
  className?: string;
};

export const UnstakingDuration = ({ api, className }: Props) => {
  const { getUnbondingPeriod } = useStakingData();

  const [unstakingPeriod, setUnstakingPeriod] = useState('');

  useEffect(() => {
    if (!api) return;

    setUnstakingPeriod(getUnbondingPeriod(api));

    return () => {
      setUnstakingPeriod('');
    };
  }, [api]);

  return <Duration className={className} seconds={unstakingPeriod} />;
};
