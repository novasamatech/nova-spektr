import { memo, useEffect, useState } from 'react';

import { getTimeToBlock } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { Timeout } from '@/shared/ui-kit';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

type Props = {
  endBlock: number | null;
  shortDateFormat?: boolean;
  icon?: IconNames;
  variant?: 'urgent' | 'warning' | 'idle';
  passedText?: string;
  hideIconText?: boolean;
};

export const TimerToBlock = memo(
  ({ endBlock, shortDateFormat, icon = 'clock', variant = 'idle', passedText, hideIconText }: Props) => {
    const api = useFellowshipApi();
    const [endTime, setEndTime] = useState<number>();

    useEffect(() => {
      if (endBlock && api) {
        getTimeToBlock(endBlock, api).then(date => {
          setEndTime(date / 1000);
        });
      }
    }, [endBlock, api]);

    if (!endTime || !api) return null;

    return (
      <Timeout
        secondsToEnd={endTime}
        icon={icon}
        variant={variant}
        shortDateFormat={shortDateFormat}
        textColor="text-text-primary"
        text={passedText}
        hideIconText={hideIconText}
      />
    );
  },
);
