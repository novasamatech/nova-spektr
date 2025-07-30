import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type AssetByChains, type Wallet } from '@/shared/core';
import { BodyText, FootnoteText } from '@/shared/ui';
import { AssetIcon, ChainIcon } from '@/shared/ui-entities';
import { AssetLinks } from '@/entities/asset';
import { networkModel } from '@/entities/network';
import { type AssetChain } from '../lib/types';

import { AssembledAssetAmount } from './AssembledAssetAmount';

type Props = {
  chain: AssetChain;
  asset: AssetByChains;
  wallet: Wallet | null;
};

export const NetworkCard = memo(({ chain, asset, wallet }: Props) => {
  const chains = useUnit(networkModel.$chains);

  return (
    <div className="flex items-center px-2 py-1">
      <div className="mr-auto flex items-center gap-x-2 px-2 py-1">
        <AssetIcon asset={asset} />
        <div className="flex flex-col gap-y-0.5">
          <BodyText>{chain.assetSymbol}</BodyText>
          <div className="flex items-center gap-x-1.5">
            <ChainIcon chain={chains[chain.chainId]} />
            <FootnoteText className="text-text-tertiary">{chain.name}</FootnoteText>
          </div>
        </div>
      </div>
      <AssembledAssetAmount asset={asset} balance={chain.balance} />
      <AssetLinks assetId={chain.assetId} chainId={chain.chainId} wallet={wallet} />
    </div>
  );
});
