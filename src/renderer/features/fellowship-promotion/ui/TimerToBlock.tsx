import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { getTimeToBlock } from '@/shared/lib/utils';
import { Timeout } from '@/shared/ui-kit';
import { fellowshipPromotionFeature } from '../models/feature';

export interface DateThresholds {
  urgent: number;
  warning: number;
}

type Props = {
  endBlock: number | null;
  shortDateFormat?: boolean;
};

export const TimerToBlock = memo(({ endBlock, shortDateFormat }: Props) => {
  const input = useUnit(fellowshipPromotionFeature.input);
  const [endTime, setEndTime] = useState<number>();

  useEffect(() => {
    if (endBlock && input) {
      getTimeToBlock(endBlock, input.api).then(date => {
        setEndTime(date / 1000);
      });
    }
  }, [endBlock, input?.api]);

  if (!endTime || !input) return null;

  return (
    <Timeout secondsToEnd={endTime} variant="idle" shortDateFormat={shortDateFormat} textColor="text-text-primary" />
  );
});
