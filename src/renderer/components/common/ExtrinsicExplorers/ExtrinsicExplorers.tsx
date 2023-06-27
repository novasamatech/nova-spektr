import { InfoPopover } from '@renderer/components/ui-redesign';
import { Icon } from '@renderer/components/ui';
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
      <Icon name="info" size={16} className="text-icon-default hover:text-icon-hover" />
    </InfoPopover>
  );
};

export default ExtrinsicExplorers;
