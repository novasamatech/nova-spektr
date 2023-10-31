import { ChainTitle } from '@entities/chain';
import type { ChainId } from '@shared/core';

type Props = {
  title: string;
  chainId: ChainId;
};

const ChainFontStyle = 'font-manrope text-header-title text-text-primary truncate';

export const OperationTitle = ({ title, chainId }: Props) => (
  <div className="flex items-center h-7 whitespace-nowrap">
    {title}
    <ChainTitle className="ml-1.5 gap-x-1.5 overflow-hidden" chainId={chainId} fontClass={ChainFontStyle} />
  </div>
);
