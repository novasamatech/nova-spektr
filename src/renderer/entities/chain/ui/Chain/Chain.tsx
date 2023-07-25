import { ElementType, useEffect, useState } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/entities/network/lib/chainsService';
import { Chain as ChainType } from '@renderer/entities/chain/model/chain';
import TextBase from '@renderer/shared/ui/Typography/common/TextBase';
import { ChainIcon } from '../../../../shared/ui/ChainIcon/ChainIcon';

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
      <ChainIcon src={chainObj?.icon} name={chainObj?.name} size={iconSize} />
      <TextBase as="span" className={cnTw('text-text-tertiary text-footnote', fontClass)}>
        {chainObj?.name}
      </TextBase>
    </Tag>
  );
};
