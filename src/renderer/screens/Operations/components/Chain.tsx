import { useEffect, useState } from 'react';

import { ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain as ChainType } from '@renderer/domain/chain';
import { FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  chainId: ChainId;
};

const Chain = ({ chainId }: Props) => {
  const { getChainById } = useChains();

  const [chain, setChain] = useState<ChainType>();

  useEffect(() => {
    getChainById(chainId).then(setChain);
  }, []);

  return (
    <div className="flex gap-1 items-center">
      <img className="inline-block mx-1" width={16} height={16} alt={chain?.name} src={chain?.icon} />
      <FootnoteText as="span" className="text-text-tertiary">
        {chain?.name}
      </FootnoteText>
    </div>
  );
};

export default Chain;
