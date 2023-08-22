import { ChainId } from '@renderer/domain/shared-kernel';
import { ChainTitle } from '@renderer/entities/chain';

type Props = {
  title: string;
  chainId: ChainId;
};

const ChainFontStyle = 'font-manrope text-medium-title text-text-primary truncate';

const OperationModalTitle = ({ title, chainId }: Props) => (
  <div className="flex items-center h-7 whitespace-nowrap">
    {title}
    <ChainTitle className="ml-1.5 gap-x-1.5 overflow-hidden" chainId={chainId} fontClass={ChainFontStyle} />
  </div>
);

export default OperationModalTitle;
