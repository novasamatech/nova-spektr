import { useUnit } from 'effector-react';

import { type AssetByChains } from '@shared/core';
import { BodyText, FootnoteText } from '@shared/ui';

import { AssetLinks } from '@entities/asset';
import { ChainIcon } from '@entities/chain';
import { networkModel } from '@entities/network';

import { type AssetChain } from '../lib/types';

import { AssembledAssetAmount } from './AssembledAssetAmount';

type Props = {
  chain: AssetChain;
  asset: AssetByChains;
};

export const NetworkCard = ({ chain, asset }: Props) => {
  const chains = useUnit(networkModel.$chains);

  return (
    <li role="button" tabIndex={0} className="flex cursor-default flex-col rounded">
      <div className="flex items-center py-1.5 px-2">
        <div className="flex items-center gap-x-2 px-2 py-1 mr-auto">
          <ChainIcon src={chains[chain.chainId].icon} name={chain.name} size={24} />
          <div>
            <BodyText>{chain.assetSymbol}</BodyText>
            <FootnoteText className="text-text-tertiary">{chain.name}</FootnoteText>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <AssembledAssetAmount asset={asset} balance={chain.balance} />
        </div>
        <AssetLinks assetId={chain.assetId} chainId={chain.chainId} />
      </div>
    </li>
  );
};
