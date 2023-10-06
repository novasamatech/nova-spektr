import { InfoPopover, Icon } from '@renderer/shared/ui';
import useExtrinsicInfo from './useExtrinsicInfo';
import type { HexString, Explorer } from '@renderer/shared/core';

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
