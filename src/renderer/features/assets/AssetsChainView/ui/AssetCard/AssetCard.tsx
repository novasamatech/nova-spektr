import { useUnit } from 'effector-react';
import { type KeyboardEvent } from 'react';

import { type Asset, type Balance, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { KeyboardKey, cnTw, totalAmount, transferableAmountBN } from '@/shared/lib/utils';
import { BodyText, Shimmering } from '@/shared/ui';
import { AssetBalance, AssetDetails, AssetIcon, AssetLinks } from '@/entities/asset';
import { AssetFiatBalance, TokenPrice, priceProviderModel } from '@/entities/price';

type Props = {
  chainId: ChainId;
  asset: Asset;
  balance?: Balance;
};

export const AssetCard = ({ chainId, asset, balance }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const [isExpanded, toggleExpanded] = useToggle();

  const onWrapperKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    event.stopPropagation();

    if (event.currentTarget === event.target && event.key === KeyboardKey.ENTER) {
      toggleExpanded();
    }
  };

  const transferableBalance = balance ? transferableAmountBN(balance) : undefined;

  // TODO: move <li> in parent beneath <ul>
  return (
    <li
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={cnTw(
        'group flex cursor-pointer flex-col rounded bg-block-background-default',
        'transition-shadow hover:shadow-card-shadow focus:shadow-card-shadow',
      )}
      onClick={toggleExpanded}
      onKeyDown={onWrapperKeyDown}
    >
      <div className="flex items-center px-2 py-1.5">
        <div className="mr-auto flex items-center gap-x-2 px-2 py-1">
          <AssetIcon asset={asset} />
          <div>
            <BodyText>{asset.name}</BodyText>
            <TokenPrice assetId={asset.priceId} />
          </div>
        </div>
        <div className="flex flex-col items-end">
          {balance?.free ? (
            <>
              <AssetBalance value={totalAmount(balance)} asset={asset} />
              <AssetFiatBalance amount={totalAmount(balance)} asset={asset} />
            </>
          ) : (
            <div className="flex flex-col items-end gap-y-1">
              <Shimmering width={82} height={20} />
              {fiatFlag && <Shimmering width={56} height={18} />}
            </div>
          )}
        </div>
        <AssetLinks assetId={asset.assetId} chainId={chainId} />
      </div>

      {isExpanded && (
        <dl className="flex gap-x-4 divide-x border-t border-divider py-4 pr-4">
          <AssetDetails asset={asset} value={transferableBalance} label={t('assetBalance.transferable')} />
          <AssetDetails asset={asset} value={balance?.frozen} label={t('assetBalance.locked')} />
          <AssetDetails asset={asset} value={balance?.reserved} label={t('assetBalance.reserved')} />
        </dl>
      )}
    </li>
  );
};
