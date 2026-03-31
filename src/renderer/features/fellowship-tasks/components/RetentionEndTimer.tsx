import { useEffect, useState } from 'react';

import { getTimeToBlock } from '@/shared/lib/utils';
import { Timeout } from '@/shared/ui-kit';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

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
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const [secondsToEnd, setSecondsToEnd] = useState<number>();

  useEffect(() => {
    if (endBlock && api && chain) {
      getTimeToBlock(endBlock, api, chain).then(date => {
        setSecondsToEnd(date / 1000);
      });
    }
  }, [endBlock, api]);

  if (!secondsToEnd) {
    return <span />;
  }

  const variant = getTimerColor(secondsToEnd);

  return <Timeout secondsToEnd={secondsToEnd} variant={variant} shortDateFormat={shortDateFormat} />;
};
