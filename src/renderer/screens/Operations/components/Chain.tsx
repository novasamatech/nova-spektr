import { useEffect, useState } from 'react';

import { ChainId } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain as ChainType } from '@renderer/domain/chain';

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
    <div className="flex gap-1">
      <img className="inline-block mx-1" width={14} height={14} alt={chain?.name} src={chain?.icon} />
      {chain?.name}
    </div>
  );
};

export default Chain;
