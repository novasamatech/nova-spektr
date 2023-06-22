import { ElementType, useEffect, useState } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain as ChainType } from '@renderer/domain/chain';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import { ChainIcon } from '@renderer/components/ui-redesign/Chain/ChainIcon/ChainIcon';

type WithChain = { chain: ChainType };
type WithChainId = { chainId: ChainId };

type Props = {
  as?: ElementType;
  fontClass?: string;
  className?: string;
  iconSize?: number;
} & (WithChain | WithChainId);

export const Chain = ({ as: Tag = 'div', fontClass, className, iconSize = 16, ...chainProps }: Props) => {
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
      <ChainIcon icon={chainObj?.icon} name={chainObj?.name} size={iconSize} />
      <TextBase as="span" className={cnTw('text-text-tertiary text-footnote', fontClass)}>
        {chainObj?.name}
      </TextBase>
    </Tag>
  );
};
