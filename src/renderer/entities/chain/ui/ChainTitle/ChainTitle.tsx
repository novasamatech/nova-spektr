import { useUnit } from 'effector-react';
import { type ElementType, memo, useMemo } from 'react';

import { type Chain, type ChainId } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { TextBase } from '@/shared/ui/Typography/common/TextBase';
import { ChainIcon } from '@/shared/ui-entities';
import { networkModel } from '@/entities/network';

type WithChain = { chain: Chain };
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

    const chainObj = useMemo(
      () => ('chain' in chainProps ? chainProps.chain : chains[chainProps.chainId]),
      [chains, chainProps],
    );

    if (!showChainName) {
      return <ChainIcon chain={chainObj} size={iconSize} />;
    }

    return (
      <Tag className={cnTw('flex items-center gap-x-2', className)}>
        <ChainIcon chain={chainObj} size={iconSize} />
        <TextBase as="span" className={cnTw('text-footnote text-text-tertiary', fontClass)}>
          {chainObj?.name}
        </TextBase>
      </Tag>
    );
  },
);
