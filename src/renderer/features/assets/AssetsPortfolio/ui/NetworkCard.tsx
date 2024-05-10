import { useUnit } from 'effector-react';

import { BodyText, FootnoteText, Shimmering } from '@shared/ui';
import { cnTw, totalAmount } from '@shared/lib/utils';
import { TokenAsset } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { priceProviderModel } from '@entities/price';
import { ChainIcon } from '@entities/chain';
import { AssetBalance, AssetLinks } from '@entities/asset';
import { networkModel } from '@entities/network';
import { AssetChain } from '../lib/types';

type Props = {
  chain: AssetChain;
  asset: TokenAsset;
};

export const NetworkCard = ({ chain, asset }: Props) => {
  const chains = useUnit(networkModel.$chains);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  return (
    <li role="button" tabIndex={0} className={cnTw('flex cursor-default flex-col rounded', 'transition-shadow')}>
      <div className="flex items-center py-1.5 px-2">
        <div className="flex items-center gap-x-2 px-2 py-1 mr-auto">
          <ChainIcon src={chains[chain.chainId].icon} name={chain.name} size={24} />
          <div>
            <BodyText>{chain.assetSymbol}</BodyText>
            <FootnoteText className="text-text-tertiary">{chain.name}</FootnoteText>
          </div>
        </div>
        <div className="flex flex-col items-end">
          {chain.balance?.free ? (
            <>
              <AssetBalance value={totalAmount(chain?.balance)} asset={asset} showSymbol={false} />
              <AssetFiatBalance amount={totalAmount(chain?.balance)} asset={asset} />
            </>
          ) : (
            <div className="flex flex-col gap-y-1 items-end">
              <Shimmering width={82} height={20} />
              {fiatFlag && <Shimmering width={56} height={18} />}
            </div>
          )}
        </div>
        <AssetLinks assetId={chain.assetId} chainId={chain.chainId} />
      </div>
    </li>
  );
};
