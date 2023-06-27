import { InfoSection } from '@renderer/components/ui-redesign/Popovers/InfoPopover/InfoPopover';
import { HexString } from '@renderer/domain/shared-kernel';
import { Explorer } from '@renderer/domain/chain';
import { ExplorerLink } from '@renderer/components/common';

const useExtrinsicInfo = (hash: HexString, explorers?: Explorer[]): InfoSection[] => {
  if (!explorers || explorers.length === 0) return [];

  return [
    {
      items: explorers.map((explorer) => ({
        id: explorer.name,
        value: <ExplorerLink explorer={explorer} hash={hash} />,
      })),
    },
  ];
};

export default useExtrinsicInfo;
