import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { getTimeToBlock } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { Timeout } from '@/shared/ui-kit';
import { fellowshipRetentionFeature } from '../models/feature';

type Props = {
  endBlock: number | null;
  shortDateFormat?: boolean;
  icon?: IconNames;
  variant?: 'urgent' | 'warning' | 'idle';
};

export const TimerToBlock = memo(({ endBlock, shortDateFormat, icon = 'clock', variant = 'idle' }: Props) => {
  const input = useUnit(fellowshipRetentionFeature.input);
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
    <Timeout
      secondsToEnd={endTime}
      icon={icon}
      variant={variant}
      shortDateFormat={shortDateFormat}
      textColor="text-text-primary"
    />
  );
});
