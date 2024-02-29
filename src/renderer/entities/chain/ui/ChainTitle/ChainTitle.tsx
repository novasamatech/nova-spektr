import { ElementType, useEffect, useState } from 'react';

import { cnTw } from '@shared/lib/utils';
import { chainsService } from '@shared/api/network';
import { ChainIcon } from '@entities/chain';
import TextBase from '@shared/ui/Typography/common/TextBase';
import type { ChainId, Chain as ChainType } from '@shared/core';

type WithChain = { chain: ChainType };
type WithChainId = { chainId: ChainId };

type Props = {
  as?: ElementType;
  fontClass?: string;
  className?: string;
  iconSize?: number;
  showChainName?: boolean;
} & (WithChain | WithChainId);

export const ChainTitle = ({
  as: Tag = 'div',
  showChainName = true,
  fontClass,
  className,
  iconSize = 16,
  ...chainProps
}: Props) => {
  const [chainObj, setChainObj] = useState<ChainType>();

  useEffect(() => {
    if ('chain' in chainProps) {
      setChainObj(chainProps.chain);
    } else {
      setChainObj(chainsService.getChainById(chainProps.chainId));
    }
  }, []);

  if (!showChainName) {
    return <ChainIcon src={chainObj?.icon} name={chainObj?.name} size={iconSize} />;
  }

  return (
    <Tag className={cnTw('flex items-center gap-x-2', className)}>
      <ChainIcon src={chainObj?.icon} name={chainObj?.name} size={iconSize} />
      <TextBase as="span" className={cnTw('text-text-tertiary text-footnote', fontClass)}>
        {chainObj?.name}
      </TextBase>
    </Tag>
  );
};
