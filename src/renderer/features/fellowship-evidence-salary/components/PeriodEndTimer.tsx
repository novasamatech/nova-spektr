import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { getTimeToBlock } from '@/shared/lib/utils';
import { Timeout } from '@/shared/ui-kit';
import { fellowshipSalaryFeature } from '../model/feature';

const ONE_DAY = 24 * 60 * 60;

function getTimerColor(wish: 'Promotion' | 'Retention', time: number): 'urgent' | 'warning' | 'idle' {
  const days = Math.floor(time / ONE_DAY);

  if (days <= 15) return 'urgent';
  if (days <= 30) return 'warning';
  return 'idle';
}

type Props = {
  endBlock: number | null;
  wish: 'Promotion' | 'Retention';
  shortDateFormat?: boolean;
};

export const PeriodEndTimer = ({ wish, endBlock, shortDateFormat }: Props) => {
  const input = useUnit(fellowshipSalaryFeature.input);
  const [endTime, setEndTime] = useState<number>();

  useEffect(() => {
    if (endBlock && input) {
      getTimeToBlock(endBlock, input.api).then(date => {
        setEndTime(date / 1000);
      });
    }
  }, [endBlock, input]);

  if (!endTime || !input) return null;
  const variant = getTimerColor(wish, endTime);

  return <Timeout at={endTime} variant={variant} shortDateFormat={shortDateFormat} />;
};
