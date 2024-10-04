import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { getTimeToBlock } from '@shared/lib/utils';
import { type AggregatedReferendum } from '../types/structs';

type Params = {
  api: ApiPromise;
  referendum: AggregatedReferendum;
};

export function useReferendumEndTime({ api, referendum }: Params): number | undefined {
  const [endTime, setEndTime] = useState<number>();

  useEffect(() => {
    if (referendum.end) {
      getTimeToBlock(referendum.end, api).then((date) => {
        setEndTime(date / 1000);
      });
    }
  }, []);

  return endTime;
}
