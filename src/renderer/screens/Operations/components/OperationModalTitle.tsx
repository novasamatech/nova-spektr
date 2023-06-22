import { Chain } from '@renderer/components/ui-redesign';
import { ChainId } from '@renderer/domain/shared-kernel';

type Props = {
  title: string;
  chainId: ChainId;
};

const ChainFontStyle = 'font-manrope text-header-title text-text-primary truncate';

const OperationModalTitle = ({ title, chainId }: Props) => (
  <div className="flex items-center h-7 whitespace-nowrap">
    {title}
    <Chain className="ml-1.5 gap-x-1.5 overflow-hidden" chainId={chainId} fontClass={ChainFontStyle} />
  </div>
);

export default OperationModalTitle;
