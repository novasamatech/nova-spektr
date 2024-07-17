import { type ElementType, useEffect, useState } from 'react';

import { chainsService } from '@shared/api/network';
import type { ChainId, Chain as ChainType } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { TextBase } from '@shared/ui/Typography/common/TextBase';

import { ChainIcon } from '@entities/chain';

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
