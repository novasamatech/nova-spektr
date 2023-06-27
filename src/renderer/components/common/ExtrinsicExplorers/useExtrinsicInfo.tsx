import { InfoSection } from '@renderer/components/ui-redesign/Popovers/InfoPopover/InfoPopover';
import { HexString } from '@renderer/domain/shared-kernel';
import { Explorer } from '@renderer/domain/chain';
import { ExplorerLink } from '@renderer/components/common';

const useExtrinsicInfo = (hash: HexString, explorers?: Explorer[]): InfoSection[] => {
  const popoverItems = [];

  if (explorers) {
    popoverItems.push({
      items: explorers.map((explorer) => ({
        id: explorer.name,
        value: <ExplorerLink explorer={explorer} hash={hash} />,
      })),
    });
  }

  return popoverItems;
};

export default useExtrinsicInfo;
