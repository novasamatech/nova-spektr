import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { type Chain } from '@/shared/core';
import { getTimeToBlock } from '@/shared/lib/utils';
import { Timeout } from '@/shared/ui-kit';

const ONE_DAY = 24 * 60 * 60;

function getTimerColor(time: number): 'urgent' | 'warning' | 'idle' {
  const days = Math.floor(time / ONE_DAY);

  if (days <= 2) return 'urgent';
  if (days <= 14) return 'warning';
  return 'idle';
}

type Props = {
  endBlock: number | null;
  api: ApiPromise;
  chain: Chain;
  shortDateFormat?: boolean;
};

export const PeriodEndTimer = ({ endBlock, api, chain, shortDateFormat }: Props) => {
  const [secondsToEnd, setSecondsToEnd] = useState<number>();

  useEffect(() => {
    if (endBlock && api) {
      getTimeToBlock(endBlock, api, chain).then(date => {
        setSecondsToEnd(date / 1000);
      });
    }
  }, [endBlock, api]);

  if (!secondsToEnd || !api) return null;
  const variant = getTimerColor(secondsToEnd);

  return <Timeout secondsToEnd={secondsToEnd} variant={variant} shortDateFormat={shortDateFormat} />;
};
