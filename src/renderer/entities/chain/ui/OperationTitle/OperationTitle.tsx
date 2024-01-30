import { ChainTitle } from '../ChainTitle/ChainTitle';
import { HeaderTitleText } from '@shared/ui';
import type { ChainId } from '@shared/core';
import { cnTw } from '@shared/lib/utils';

type Props = {
  title: string;
  chainId: ChainId;
  className?: string;
};

const ChainFontStyle = 'font-manrope text-header-title text-text-primary truncate';

export const OperationTitle = ({ title, chainId, className }: Props) => (
  <div className={cnTw('flex items-center h-7 whitespace-nowrap', className)}>
    <HeaderTitleText>{title}</HeaderTitleText>
    <ChainTitle className="ml-1.5 gap-x-1.5 overflow-hidden" chainId={chainId} fontClass={ChainFontStyle} />
  </div>
);
