import { InfoSection } from '@renderer/shared/ui/Popovers/InfoPopover/InfoPopover';
import { ExplorerLink } from '@renderer/components/common';
import type { HexString, Explorer } from '@renderer/shared/core';

const useExtrinsicInfo = (hash: HexString, explorers?: Explorer[]): InfoSection[] => {
  if (!explorers || explorers.length === 0) return [];

  return [
    {
      items: explorers
        .filter((explorer) => Boolean(explorer.extrinsic))
        .map((explorer) => ({
          id: explorer.name,
          value: <ExplorerLink explorer={explorer} hash={hash} />,
        })),
    },
  ];
};

export default useExtrinsicInfo;
