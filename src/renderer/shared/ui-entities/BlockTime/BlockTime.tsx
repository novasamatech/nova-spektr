import { type ApiPromise } from '@polkadot/api';
import { memo, useEffect, useState } from 'react';

import { type BlockHeight, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getCreatedDateFromApi } from '@/shared/lib/utils';

type Props = {
  api: ApiPromise;
  chain: Chain;
  block: BlockHeight;
  format?: string;
};

export const BlockTime = memo(({ api, chain, block, format = 'dd.MM.yyyy' }: Props) => {
  const { formatDate } = useI18n();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    getCreatedDateFromApi(block, api, chain).then(date => {
      if (mounted) {
        setTime(formatDate(date, format));
      }
    });

    return () => {
      mounted = false;
    };
  }, [block, api, format]);

  return <span>{time}</span>;
});
