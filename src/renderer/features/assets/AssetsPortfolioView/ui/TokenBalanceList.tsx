import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type AssetByChains } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Accordion, BodyText, FootnoteText, Icon, IconButton, Plate, Tooltip } from '@/shared/ui';
import { AssetIcon } from '@/shared/ui-entities';
import { networkModel } from '@/entities/network';
import { TokenPrice } from '@/entities/price';
import { CheckPermission, OperationType, walletModel } from '@/entities/wallet';
import { tokensService } from '../lib/tokensService';
import { portfolioModel } from '../model/portfolio-model';

import { AssembledAssetAmount } from './AssembledAssetAmount';
import { ChainsList } from './ChainsList';
import { NetworkCard } from './NetworkCard';

const IconButtonStyle =
  'hover:bg-transparent hover:text-icon-default focus:bg-transparent focus:text-icon-default active:bg-transparent active:text-icon-default';

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
    <Plate className="z-10 border-b-4 border-double p-0 shadow-stack">
      <Accordion>
        <Accordion.Button
          iconOpened="shelfDown"
          iconClosed="shelfRight"
          buttonClass="sticky top-0 px-2 py-1.5 z-10 justify-end flex-row-reverse bg-white hover:bg-token-container-background
          rounded h-[52px] transition-shadow hover:shadow-card-shadow focus:shadow-card-shadow"
        >
          <div className="flex w-full items-center">
            <div className="flex flex-1 items-center gap-x-2">
              <AssetIcon asset={asset} />
              <div className="flex flex-col">
                <BodyText>{asset.symbol}</BodyText>
                <div className="flex items-center">
                  <ChainsList chains={chains} assetChains={asset.chains} />
                  <FootnoteText className="ml-1.5 text-text-tertiary">
                    {t('balances.availableNetworks', { count: asset.chains.length })}
                  </FootnoteText>
                  {totalBalance.verified && (
                    <div className="ml-2.5 flex items-center gap-x-2 text-text-warning">
                      <Tooltip content={t('balances.verificationTooltip')} pointer="up">
                        <Icon name="warn" className="cursor-pointer text-inherit" size={14} />
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <TokenPrice
              assetId={asset.priceId}
              wrapperClassName="flex-col gap-0.5 items-end px-2 w-[100px]"
              className="text-text-primar text-right"
            />
            <div className="flex w-[100px] flex-col items-end">
              <AssembledAssetAmount asset={asset} balance={totalBalance} />
            </div>

            <div className="ml-3 flex gap-x-2">
              <CheckPermission operationType={OperationType.TRANSFER} wallet={activeWallet}>
                <IconButton size={20} name="sendArrow" className={IconButtonStyle} onClick={handleSend} />
              </CheckPermission>
              <CheckPermission operationType={OperationType.RECEIVE} wallet={activeWallet}>
                <IconButton size={20} name="receiveArrow" className={IconButtonStyle} onClick={handleReceive} />
              </CheckPermission>
            </div>
          </div>
        </Accordion.Button>

        <Accordion.Content className="mt-1">
          <ul className="flex flex-col gap-y-1.5 pl-4">
            {asset.chains.map((chain) => (
              <NetworkCard key={`${chain.chainId}-${chain.assetId}`} chain={chain} asset={asset} />
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </Plate>
  );
});
