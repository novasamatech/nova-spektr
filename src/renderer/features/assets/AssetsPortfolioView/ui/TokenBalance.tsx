import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import type { AssetByChains } from '@shared/core';
import { BodyText, CaptionText, FootnoteText, Icon, Plate, Tooltip } from '@shared/ui';
import { AssetIcon, AssetLinks } from '@entities/asset';
import { ChainIcon } from '@entities/chain';
import { networkModel } from '@entities/network';
import { TokenPrice } from '@entities/price';

import { AssembledAssetAmount } from './AssembledAssetAmount';

type Props = {
  asset: AssetByChains;
};

export const TokenBalance = ({ asset }: Props) => {
  const { t } = useI18n();
  const chain = asset.chains[0];

  const chains = useUnit(networkModel.$chains);

  return (
    <Plate
      className="p-0 z-10 h-[52px] w-full items-center flex pl-[30px] pr-2
    transition-shadow hover:shadow-card-shadow focus:shadow-card-shadow"
    >
      <div className="flex gap-x-2 flex-1">
        <div className="flex items-center gap-x-2">
          <AssetIcon src={asset.icon} name={asset.name} />
          <div>
            <BodyText>{chain.assetSymbol}</BodyText>
            <div className="flex items-center gap-x-1.5 mr-3">
              <FootnoteText className="text-text-tertiary">{chain.name}</FootnoteText>
              <ChainIcon src={chains[chain.chainId].icon} name={chain.name} size={18} />
              {chain.balance?.verified && (
                <div className="flex items-center gap-x-2 text-text-warning">
                  <Tooltip content={t('balances.verificationTooltip')} pointer="up">
                    <Icon name="warn" className="cursor-pointer text-inherit" size={16} />
                  </Tooltip>
                  <CaptionText className="uppercase text-inherit">{t('balances.verificationFailedLabel')}</CaptionText>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <TokenPrice
        assetId={asset.priceId}
        wrapperClassName="flex-col gap-0.5 items-end px-2 w-[100px]"
        className="text-text-primar text-right"
      />
      <div className="flex flex-col items-end w-[100px]">
        <AssembledAssetAmount asset={asset} balance={chain.balance} />
      </div>
      <AssetLinks assetId={asset.chains[0].assetId} chainId={chain.chainId} />
    </Plate>
  );
};
