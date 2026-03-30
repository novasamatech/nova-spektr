import { useEffect, useState } from 'react';

import { getTimeToBlock } from '@/shared/lib/utils';
import { Timeout } from '@/shared/ui-kit';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

const ONE_DAY = 24 * 60 * 60;

export interface DateThresholds {
  urgent: number;
  warning: number;
}

function getTimerColor(time: number, thresholds: DateThresholds): 'urgent' | 'warning' | 'idle' {
  const days = Math.floor(time / ONE_DAY);

  if (days <= thresholds.urgent) return 'urgent';
  if (days <= thresholds.warning) return 'warning';
  return 'idle';
}

type Props = {
  endBlock: number | null;
  shortDateFormat?: boolean;
  dateThresholds: DateThresholds;
};

export const ReferendumEndTimer = ({ endBlock, shortDateFormat, dateThresholds }: Props) => {
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
  const variant = getTimerColor(endTime, dateThresholds);

  return <Timeout secondsToEnd={endTime} variant={variant} shortDateFormat={shortDateFormat} />;
};
