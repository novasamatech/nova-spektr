import { useUnit } from 'effector-react';
import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type AssetByChains } from '@/shared/core';
import { BodyText, FootnoteText, Plate } from '@/shared/ui';
import { AssetIcon, ChainIcon } from '@/shared/ui-entities';
import { AssetLinks } from '@/entities/asset';
import { networkModel } from '@/entities/network';
import { TokenPrice } from '@/entities/price';
import { walletSelect } from '@/aggregates/wallet-select';

import { AssembledAssetAmount } from './AssembledAssetAmount';

type Props = {
  asset: AssetByChains;
};

export const TokenBalance = memo(({ asset }: Props) => {
  const wallet = useUnit(walletSelect.$selectedWallet);
  const chains = useUnit(networkModel.$chains);

  const chain = asset.chains[0];

  return (
    <Plate className="z-10 flex h-[52px] w-full items-center p-0 pr-2 pl-[36px]">
      <div className="flex flex-1 gap-x-2" data-testid={TEST_IDS.ASSETS.TOKEN_PLATE}>
        <div className="flex items-center gap-x-2">
          <AssetIcon asset={asset} />
          <div className="flex flex-col gap-y-0.5">
            <BodyText>{chain.assetSymbol}</BodyText>
            <div className="mr-3 flex items-center gap-x-1.5">
              <ChainIcon chain={chains[chain.chainId]} size={18} />
              <FootnoteText className="text-text-tertiary">{chain.name}</FootnoteText>
            </div>
          </div>
        </div>
      </div>

      <TokenPrice
        assetId={asset.priceId}
        wrapperClassName="flex-col gap-0.5 items-end px-2 w-[100px]"
        className="text-text-primar text-right"
      />
      <AssembledAssetAmount asset={asset} balance={chain.balance} />
      <AssetLinks assetId={asset.chains[0]!.assetId} chainId={chain.chainId} wallet={wallet} />
    </Plate>
  );
});
