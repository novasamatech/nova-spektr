import { InfoPopover, Icon } from '@renderer/shared/ui';
import { Explorer } from '@renderer/domain/chain';
import useExtrinsicInfo from './useExtrinsicInfo';
import { HexString } from '@renderer/domain/shared-kernel';

type Props = {
  hash: HexString;
  explorers?: Explorer[];
};

const ExtrinsicExplorers = ({ hash, explorers = [] }: Props) => {
  const popoverItems = useExtrinsicInfo(hash, explorers);

  return (
    <InfoPopover data={popoverItems} position="right-0 top-full">
      <Icon name="info" size={16} className="hover:text-icon-hover" />
    </InfoPopover>
  );
};

export default ExtrinsicExplorers;
