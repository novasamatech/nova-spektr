import { ElementType, useEffect, useState } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/entities/network';
import { Chain as ChainType, ChainIcon } from '@renderer/entities/chain';
import { FootnoteText } from '@renderer/shared/ui';

type WithChain = { chain: ChainType };
type WithChainId = { chainId: ChainId };

type Props = {
  as?: ElementType;
  fontClass?: string;
  className?: string;
  iconSize?: number;
} & (WithChain | WithChainId);

export const ChainTitle = ({ as: Tag = 'div', fontClass, className, iconSize = 16, ...chainProps }: Props) => {
  const { getChainById } = useChains();

  const [chainObj, setChainObj] = useState<ChainType>();

  useEffect(() => {
    if ('chain' in chainProps) {
      setChainObj(chainProps.chain);
    } else {
      getChainById(chainProps.chainId).then(setChainObj);
    }
  }, []);

  return (
    <Tag className={cnTw('flex items-center gap-x-2', className)}>
      <ChainIcon src={chainObj?.icon} name={chainObj?.name} size={iconSize} />
      <FootnoteText className={cnTw('text-text-tertiary', fontClass)}>{chainObj?.name}</FootnoteText>
    </Tag>
  );
};
