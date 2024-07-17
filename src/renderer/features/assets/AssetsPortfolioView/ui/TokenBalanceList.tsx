import React from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Accordion, BodyText, FootnoteText, HelpText, Icon, IconButton, Plate, Tooltip } from '@shared/ui';
import type { AssetByChains } from '@shared/core';
import { CheckPermission, OperationType, walletModel } from '@entities/wallet';
import { TokenPrice } from '@entities/price';
import { AssetIcon } from '@entities/asset';
import { networkModel } from '@entities/network';
import { ChainIcon } from '@entities/chain';
import { NetworkCard } from './NetworkCard';
import { AssembledAssetAmount } from './AssembledAssetAmount';
import { portfolioModel } from '../model/portfolio-model';

const IconButtonStyle =
  'hover:bg-transparent hover:text-icon-default focus:bg-transparent focus:text-icon-default active:bg-transparent active:text-icon-default';

type Props = {
  asset: AssetByChains;
};

export const TokenBalanceList = ({ asset }: Props) => {
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

  return (
    <Plate className="p-0 shadow-shards border-b-4 border-double z-10">
      <Accordion>
        <Accordion.Button
          iconOpened="shelfDown"
          iconClosed="shelfRight"
          buttonClass="sticky top-0 px-2 py-1.5 z-10 justify-end flex-row-reverse bg-white hover:bg-token-container-background 
          rounded h-[52px] transition-shadow hover:shadow-card-shadow focus:shadow-card-shadow"
        >
          <div className="w-full items-center flex">
            <div className="flex items-center gap-x-2 flex-1">
              <AssetIcon src={asset.icon} name={asset.name} />
              <div className="flex flex-col">
                <BodyText>{asset.symbol}</BodyText>
                <div className="flex items-center">
                  <FootnoteText className="text-text-tertiary mr-1.5">
                    {t('balances.availableNetworks', { count: asset.chains.length })}
                  </FootnoteText>
                  <ChainIcon
                    key={`${asset.chains[0].chainId}-${asset.chains[0].assetSymbol}`}
                    src={chains[asset.chains[0].chainId].icon}
                    name={asset.chains[0].name}
                    size={18}
                  />
                  <ChainIcon
                    key={`${asset.chains[1].chainId}-${asset.chains[1].assetSymbol}`}
                    className="mx-[-8px]"
                    src={chains[asset.chains[1].chainId].icon}
                    name={asset.chains[1].name}
                    size={18}
                  />
                  {asset.chains.length > 2 && (
                    <div className="b-r-2 w-6 rounded flex items-center justify-center bg-token-background p-0.5">
                      <HelpText className="text-white">+{asset.chains.length - 2}</HelpText>
                    </div>
                  )}
                  {asset.totalBalance?.verified && (
                    <div className="flex items-center gap-x-2 text-text-warning ml-2.5">
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
            <div className="flex flex-col items-end w-[100px]">
              <AssembledAssetAmount asset={asset} balance={asset.totalBalance} />
            </div>

            <div className="flex gap-x-2 ml-3">
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
          <ul className="flex flex-col gap-y-1.5 pl-6">
            {asset.chains.map((chain) => (
              <NetworkCard key={`${chain.chainId}-${chain.assetId}`} chain={chain} asset={asset} />
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </Plate>
  );
};
