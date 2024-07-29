import { type ChainId } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { HeaderTitleText } from '@shared/ui';
import { ChainTitle } from '../ChainTitle/ChainTitle';

type Props = {
  title: string;
  chainId: ChainId;
  className?: string;
};

export const OperationTitle = ({ title, chainId, className }: Props) => (
  <div className={cnTw('flex flex-1 items-center h-7 truncate', className)}>
    <HeaderTitleText>{title}</HeaderTitleText>
    <ChainTitle
      chainId={chainId}
      className="ml-1.5 gap-x-1.5 overflow-hidden"
      fontClass="font-manrope text-header-title text-text-primary truncate"
    />
  </div>
);
