import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { Icon, Tooltip, BodyText, Plate, Shimmering, FootnoteText, CaptionText } from '@shared/ui';
import type { Balance, TokenAsset } from '@shared/core';
import { totalAmount } from '@shared/lib/utils';
import { priceProviderModel, AssetFiatBalance, TokenPrice } from '@entities/price';
import { balanceModel } from '@entities/balance';
import { AssetBalance, AssetIcon, AssetLinks } from '@entities/asset';
import { networkModel } from '@entities/network';
import { ChainIcon } from '@entities/chain';

type Props = {
  asset: TokenAsset;
};

export const TokenBalance = ({ asset }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const balances = useUnit(balanceModel.$balances);
  const chains = useUnit(networkModel.$chains);
  const [balance, setBalances] = useState<Balance>();

  const hasFailedVerification = balances?.some((b) => b.verified !== undefined && !b.verified);

  useEffect(() => {
    const chainBalance = balances.find((b) => b.chainId == chain.chainId && chain.assetId.toString() == b.assetId);

    setBalances(chainBalance);
  }, [balances]);

  const chain = asset.chains[0];

  return (
    <Plate className="p-0 z-10 h-[52px] w-full items-center grid grid-cols-[1fr,100px,100px,60px] pl-[30px] pr-2">
      <div className="flex gap-x-2">
        <div className="flex items-center gap-x-2">
          <AssetIcon src={asset.icon} name={asset.name} />
          <div>
            <BodyText>{chain.assetSymbol}</BodyText>
            <div className="flex items-center gap-x-1.5 mr-3">
              <FootnoteText className="text-text-tertiary">{chain.name}</FootnoteText>
              <ChainIcon src={chains[chain.chainId].icon} name={chain.name} size={18} />
              {hasFailedVerification && (
                <div className="flex items-center gap-x-2 text-text-warning">
                  {/* FIXME: tooltip not visible when first displayed network invalid. For now just render it below icon */}
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
        wrapperClassName="flex-col gap-0.5 items-end px-2"
        className="text-text-primar text-right"
      />
      <div className="flex flex-col items-end">
        {balance?.free ? (
          <>
            <AssetBalance value={totalAmount(balance)} asset={asset} showSymbol={false} />
            <AssetFiatBalance amount={totalAmount(balance)} asset={asset} />
          </>
        ) : (
          <div className="flex flex-col gap-y-1 items-end">
            <Shimmering width={82} height={20} />
            {fiatFlag && <Shimmering width={56} height={18} />}
          </div>
        )}
      </div>
      <AssetLinks assetId={asset.chains[0].assetId} chainId={chain.chainId} />
    </Plate>
  );
};
