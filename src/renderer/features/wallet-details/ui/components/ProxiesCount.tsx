import { useUnit } from 'effector-react';

import { cnTw } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';
import { walletProxiesModel } from '../../model/wallet-proxies-model';

type Props = {
  count: number;
  className?: string;
};

export const ProxiesCount = ({ count, className }: Props) => {
  const isLoading = useUnit(walletProxiesModel.$isLoading);

  if (isLoading) {
    return <Skeleton width={2} height={2.5} />;
  }

  if (count === 0) {
    return null;
  }

  return <span className={cnTw('text-text-tertiary', className)}>{count}</span>;
};
