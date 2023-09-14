import { Icon } from '@renderer/shared/ui';
import { ChainTitle } from '../ChainTitle/ChainTitle';
import { ChainId } from '@renderer/domain/shared-kernel';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  chainIdFrom: ChainId;
  chainIdTo?: ChainId;
  className?: string;
};

export const XcmChains = ({ chainIdFrom, chainIdTo, className }: Props) => {
  if (!chainIdTo) {
    return <ChainTitle chainId={chainIdFrom} showChainName={false} />;
  }

  return (
    <div className={cnTw('flex gap-x-2', className)}>
      <ChainTitle chainId={chainIdFrom} showChainName={false} />
      <Icon name="arrowRight" size={16} />
      <ChainTitle chainId={chainIdTo} showChainName={false} />
    </div>
  );
};
