import { InfoSection } from '@renderer/shared/ui/Popovers/InfoPopover/InfoPopover';
import type { HexString, Explorer } from '@renderer/shared/core';
import { ExplorerLink } from '@renderer/shared/ui';
import { getExtrinsicExplorer } from '@renderer/shared/lib/utils';

const useExtrinsicInfo = (hash: HexString, explorers?: Explorer[]): InfoSection[] => {
  if (!explorers || explorers.length === 0) return [];

  return [
    {
      items: explorers
        .filter((explorer) => Boolean(explorer.extrinsic))
        .map((explorer) => ({
          id: explorer.name,
          value: <ExplorerLink name={explorer.name} href={getExtrinsicExplorer(explorer, hash)} />,
        })),
    },
  ];
};

export default useExtrinsicInfo;
