import { type ChainId } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { Icon } from '@shared/ui';
import { ChainTitle } from '../ChainTitle/ChainTitle';

type Props = {
  chainIdFrom: ChainId;
  chainIdTo?: ChainId;
  className?: string;
};

export const XcmChains = ({ chainIdFrom, chainIdTo, className }: Props) => {
  if (!chainIdTo) {
    return <ChainTitle chainId={chainIdFrom} className={className} />;
  }

  return (
    <div className={cnTw('flex gap-x-2', className)}>
      <ChainTitle chainId={chainIdFrom} showChainName={false} />
      <Icon name="arrowRight" size={16} />
      <ChainTitle chainId={chainIdTo} showChainName={false} />
    </div>
  );
};
