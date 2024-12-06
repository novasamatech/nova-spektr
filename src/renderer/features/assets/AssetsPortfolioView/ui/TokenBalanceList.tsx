import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type AssetByChains } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, Icon, IconButton } from '@/shared/ui';
import { AssetIcon } from '@/shared/ui-entities';
import { CardStack, Tooltip } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { TokenPrice } from '@/entities/price';
import { CheckPermission, OperationType, walletModel } from '@/entities/wallet';
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

  const activeWallet = useUnit(walletModel.$activeWallet);
  const chains = useUnit(networkModel.$chains);

  const handleSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    portfolioModel.events.transferStarted(asset);
  };

  const handleReceive = (e: React.MouseEvent) => {
    e.stopPropagation();
    portfolioModel.events.receiveStarted(asset);
  };

  const totalBalance = useMemo(() => tokensService.calculateTotalBalance(asset.chains), [asset.chains]);

  return (
    <CardStack>
      <CardStack.Trigger>
        <div className="flex w-full items-center">
          <div className="flex flex-1 items-center gap-x-2 py-0.5">
            <AssetIcon asset={asset} />
            <div className="flex flex-col gap-y-0.5">
              <BodyText>{asset.symbol}</BodyText>
              <div className="flex items-center">
                <ChainsList chains={chains} assetChains={asset.chains} />
                <FootnoteText className="ml-1.5 text-text-tertiary">
                  {t('balances.availableNetworks', { count: asset.chains.length })}
                </FootnoteText>
                {totalBalance.verified && (
                  <Tooltip>
                    <Tooltip.Trigger>
                      <div tabIndex={0} className="ml-2 text-text-warning">
                        <Icon name="warn" className="cursor-pointer text-inherit" size={14} />
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>{t('balances.verificationTooltip')}</Tooltip.Content>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
          <TokenPrice
            assetId={asset.priceId}
            wrapperClassName="flex-col gap-0.5 items-end px-2 w-[100px]"
            className="text-text-primar text-right"
          />
          <AssembledAssetAmount asset={asset} balance={totalBalance} />

          <div className="ml-3 flex gap-x-2">
            <CheckPermission operationType={OperationType.TRANSFER} wallet={activeWallet}>
              <IconButton size={20} name="sendArrow" onClick={handleSend} />
            </CheckPermission>
            <CheckPermission operationType={OperationType.RECEIVE} wallet={activeWallet}>
              <IconButton size={20} name="receiveArrow" onClick={handleReceive} />
            </CheckPermission>
          </div>
        </div>
      </CardStack.Trigger>
      <CardStack.Content>
        <ul className="flex flex-col pl-5">
          {asset.chains.map((chain) => (
            <li key={`${chain.chainId}-${chain.assetId}`}>
              <NetworkCard chain={chain} asset={asset} />
            </li>
          ))}
        </ul>
      </CardStack.Content>
    </CardStack>
  );
});
