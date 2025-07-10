import { useUnit } from 'effector-react';
import { type ElementType, memo, useMemo } from 'react';

import { type ChainId, type Chain as ChainType } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { TextBase } from '@/shared/ui/Typography/common/TextBase';
import { networkModel } from '@/entities/network';
import { ChainIcon } from '../ChainIcon/ChainIcon';

type WithChain = { chain: ChainType };
type WithChainId = { chainId: ChainId };

type Props = {
  as?: ElementType;
  fontClass?: string;
  className?: string;
  iconSize?: number;
  showChainName?: boolean;
} & (WithChain | WithChainId);

export const ChainTitle = memo(
  ({ as: Tag = 'div', showChainName = true, fontClass, className, iconSize = 16, ...chainProps }: Props) => {
    const chains = useUnit(networkModel.$chains);

    const chainObj = useMemo(() => ('chain' in chainProps ? chainProps.chain : chains[chainProps.chainId]), []);

    if (!showChainName) {
      return <ChainIcon src={chainObj?.icon} name={chainObj?.name} size={iconSize} />;
    }

    return (
      <Tag className={cnTw('flex items-center gap-x-2', className)}>
        <ChainIcon src={chainObj?.icon} name={chainObj?.name} size={iconSize} />
        <TextBase as="span" className={cnTw('text-footnote text-text-tertiary', fontClass)}>
          {chainObj?.name}
        </TextBase>
      </Tag>
    );
  },
);
