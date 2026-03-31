import { memo, useEffect, useState } from 'react';

import { getTimeToBlock } from '@/shared/lib/utils';
import { Timeout } from '@/shared/ui-kit';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export interface DateThresholds {
  urgent: number;
  warning: number;
}

type Props = {
  endBlock: number | null;
  shortDateFormat?: boolean;
};

export const TimerToBlock = memo(({ endBlock, shortDateFormat }: Props) => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const [endTime, setEndTime] = useState<number>();

  useEffect(() => {
    if (endBlock && api && chain) {
      getTimeToBlock(endBlock, api, chain).then(date => {
        setEndTime(date / 1000);
      });
    }
  }, [endBlock, api]);

  if (!endTime || !api) return null;

  return (
    <Timeout secondsToEnd={endTime} variant="idle" shortDateFormat={shortDateFormat} textColor="text-text-primary" />
  );
});
