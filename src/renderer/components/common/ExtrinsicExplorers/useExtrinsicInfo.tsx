import { InfoSection } from '@shared/ui/Popovers/InfoPopover/InfoPopover';
import type { HexString, Explorer } from '@shared/core';
import { ExplorerLink } from '@shared/ui';
import { getExtrinsicExplorer } from '@shared/lib/utils';

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
