import { type ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { type ReferendumStatus } from '@/shared/core';
import { getTimeToBlock } from '@/shared/lib/utils';
import { ReferendumTimer } from '@/entities/governance';

type Props = {
  timelineApi: ApiPromise;
  status: ReferendumStatus | null;
  endBlock: number | null;
  shortDateFormat?: boolean;
};

export const ReferendumEndTimer = ({ status, endBlock, timelineApi, shortDateFormat }: Props) => {
  const [endTime, setEndTime] = useState<number>();

  useEffect(() => {
    if (endBlock) {
      getTimeToBlock(endBlock, timelineApi).then((date) => {
        setEndTime(date / 1000);
      });
    }
  }, [endBlock]);

  if (!endBlock || !status || !endTime) return null;

  return <ReferendumTimer status={status} time={endTime} shortDateFormat={shortDateFormat} />;
};
