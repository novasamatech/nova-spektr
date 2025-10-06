import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { getTimeToBlock } from '@/shared/lib/utils';
import { Timeout } from '@/shared/ui-kit';
import { fellowshipVotingFeature } from '../model/feature';

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
  const input = useUnit(fellowshipVotingFeature.input);
  const [endTime, setEndTime] = useState<number>();

  useEffect(() => {
    if (endBlock && input) {
      getTimeToBlock(endBlock, input.api).then(date => {
        setEndTime(date / 1000);
      });
    }
  }, [endBlock, input?.api]);

  if (!endTime || !input) return null;
  const variant = getTimerColor(endTime, dateThresholds);

  return <Timeout secondsToEnd={endTime} variant={variant} shortDateFormat={shortDateFormat} />;
};
