import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { getTimeToBlock } from '@/shared/lib/utils';
import { Timeout } from '@/shared/ui-kit';
import { fellowshipTasksFeature } from '../model/feature';

const ONE_DAY = 24 * 60 * 60;

function getTimerColor(time: number): 'urgent' | 'warning' | 'idle' {
  const days = Math.floor(time / ONE_DAY);

  if (days <= 2) return 'urgent';
  if (days <= 14) return 'warning';
  return 'idle';
}

type Props = {
  endBlock: number | null;
  shortDateFormat?: boolean;
};

export const RetentionEndTimer = ({ endBlock, shortDateFormat }: Props) => {
  const input = useUnit(fellowshipTasksFeature.input);
  const [secondsToEnd, setSecondsToEnd] = useState<number>();

  useEffect(() => {
    if (endBlock && input) {
      getTimeToBlock(endBlock, input.api).then(date => {
        setSecondsToEnd(date / 1000);
      });
    }
  }, [endBlock, input?.api]);

  if (!secondsToEnd || !input) return null;
  const variant = getTimerColor(secondsToEnd);

  return <Timeout secondsToEnd={secondsToEnd} variant={variant} shortDateFormat={shortDateFormat} />;
};
