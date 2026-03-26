import { useUnit } from 'effector-react';
import { type MouseEvent, memo, useMemo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type AssetByChains } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, IconButton } from '@/shared/ui';
import { AssetIcon } from '@/shared/ui-entities';
import { CardStack } from '@/shared/ui-kit';
import { CheckPermission, OperationType } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { TokenPrice } from '@/widgets/price';
import { tokensService } from '../lib/tokensService';
import { portfolioModel } from '../model/portfolio-model';

import { AssembledAssetAmount } from './AssembledAssetAmount';
import { ChainsList } from './ChainsList';
import { NetworkCard } from './NetworkCard';

type Props = {
  asset: AssetByChains;
};

export const TokenBalanceList = memo(({ asset }: Props) => {
  const { t } = useI18n();

  const wallet = useUnit(walletSelect.$selectedWallet);

  const handleSend = (e: MouseEvent) => {
    e.stopPropagation();
    portfolioModel.events.transferStarted(asset);
  };

  const handleReceive = (e: MouseEvent) => {
    e.stopPropagation();
    portfolioModel.events.receiveStarted(asset);
  };

  const totalBalance = useMemo(() => tokensService.calculateTotalBalance(asset.chains), [asset.chains]);

  return (
    <CardStack>
      <CardStack.Trigger sticky>
        <div className="flex w-full items-center" data-testid={TEST_IDS.ASSETS.TOKEN_PLATE}>
          <div className="flex flex-1 items-center gap-x-2 py-0.5">
            <AssetIcon asset={asset} />
            <div className="flex flex-col gap-y-0.5">
              <BodyText>{asset.symbol}</BodyText>
              <div className="flex items-center">
                <ChainsList assetChains={asset.chains} />
                <FootnoteText className="ml-1.5 text-text-tertiary">
                  {t('balances.availableNetworks', { count: asset.chains.length })}
                </FootnoteText>
              </div>
            </div>
          </div>
          <TokenPrice
            assetId={asset.priceId}
            wrapperClassName="flex-col gap-0.5 items-end px-2 w-[100px]"
            className="text-text-primar text-right"
          />
          <AssembledAssetAmount asset={asset} balance={totalBalance} />

          <div className="ml-4 flex gap-x-2">
            <CheckPermission operationType={OperationType.TRANSFER} wallet={wallet}>
              <IconButton size={20} name="sendArrow" onClick={handleSend} />
            </CheckPermission>
            <CheckPermission operationType={OperationType.RECEIVE} wallet={wallet}>
              <IconButton size={20} name="receiveArrow" onClick={handleReceive} />
            </CheckPermission>
          </div>
        </div>
      </CardStack.Trigger>
      <CardStack.Content>
        <ul className="flex flex-col pl-5">
          {asset.chains.map((chain) => (
            <li key={`${chain.chainId}-${chain.assetId}`}>
              <NetworkCard chain={chain} asset={asset} wallet={wallet} />
            </li>
          ))}
        </ul>
      </CardStack.Content>
    </CardStack>
  );
});
