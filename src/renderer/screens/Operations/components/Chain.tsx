import { useEffect, useState } from 'react';
import cn from 'classnames';

import { ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain as ChainType } from '@renderer/domain/chain';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

type Props = {
  chainId: ChainId;
  fontProps?: TypographyProps;
  className?: string;
};

const DefaultFontStyle = 'text-text-tertiary text-footnote font-inter';

const Chain = ({ chainId, fontProps = { className: DefaultFontStyle }, className }: Props) => {
  const { getChainById } = useChains();

  const [chain, setChain] = useState<ChainType>();

  useEffect(() => {
    getChainById(chainId).then(setChain);
  }, []);

  return (
    <div className={cn('flex gap-x-1 items-center', className)}>
      <img className="inline-block mx-1" width={16} height={16} alt={chain?.name} src={chain?.icon} />
      <TextBase as="span" {...fontProps}>
        {chain?.name}
      </TextBase>
    </div>
  );
};

export default Chain;
