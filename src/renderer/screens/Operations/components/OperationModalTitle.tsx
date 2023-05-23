import Chain from '@renderer/screens/Operations/components/Chain/Chain';
import { ChainId } from '@renderer/domain/shared-kernel';

type Props = { title: string; chainId: ChainId };

const ChainFontStyle = 'font-manrope text-modal-title text-text-primary';

const OperationModalTitle = ({ title, chainId }: Props) => (
  <div className="flex items-center py-1">
    {title}
    <Chain
      className="ml-1.5 gap-x-1.5 text-ellipsis"
      chainId={chainId}
      fontProps={{ className: ChainFontStyle, fontWeight: 'bold' }}
    />
  </div>
);

export default OperationModalTitle;
