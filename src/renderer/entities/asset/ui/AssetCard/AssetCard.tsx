import { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { BodyText, Icon, Shimmering } from '@renderer/shared/ui';
import { AssetBalance, AssetDetails, AssetIcon } from '@renderer/entities/asset';
import { useToggle } from '@renderer/shared/lib/hooks';
import { cnTw, KeyboardKey, totalAmount, transferableAmount } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';
import { Paths, createLink } from '@renderer/shared/routes';
import { ChainId, Asset, Balance } from '@renderer/shared/core';
// TODO: Move it to another layer https://app.clickup.com/t/8692tr8x0
import { TokenPrice } from '@renderer/entities/price/ui/TokenPrice';
import { AssetFiatBalance } from '@renderer/entities/price/ui/AssetFiatBalance';
import { priceProviderModel } from '@renderer/entities/price';

type Props = {
  chainId: ChainId;
  asset: Asset;
  balance?: Balance;
  canMakeActions?: boolean;
};

export const AssetCard = ({ chainId, asset, balance, canMakeActions }: Props) => {
  const { t } = useI18n();
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const [isExpanded, toggleExpanded] = useToggle();

  const onWrapperKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    event.stopPropagation();

    if (event.currentTarget === event.target && event.key === KeyboardKey.ENTER) {
      toggleExpanded();
    }
  };

  const transferableBalance = balance?.free ? transferableAmount(balance) : undefined;

  // TODO: move <li> in parent beneath <ul>
  return (
    <li
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={cnTw(
        'flex flex-col group cursor-pointer bg-block-background-default rounded',
        'transition-shadow hover:shadow-card-shadow focus:shadow-card-shadow',
      )}
      onClick={toggleExpanded}
      onKeyDown={onWrapperKeyDown}
    >
      <div className="flex items-center py-1.5 px-2">
        <div className="flex items-center gap-x-2 px-2 py-1  mr-auto">
          <AssetIcon src={asset.icon} name={asset.name} />
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
            <>
              <Shimmering width={82} height={20} />
              {fiatFlag && <Shimmering width={56} height={18} />}
            </>
          )}
        </div>
        {canMakeActions && (
          <div className="flex gap-x-2 ml-3">
            <Link
              to={createLink(Paths.SEND_ASSET, {}, { chainId: [chainId], assetId: [asset.assetId] })}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="sendArrow" size={20} />
            </Link>
            <Link
              to={createLink(Paths.RECEIVE_ASSET, {}, { chainId: [chainId], assetId: [asset.assetId] })}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="receiveArrow" size={20} />
            </Link>
          </div>
        )}
      </div>

      {isExpanded && (
        <dl className="flex divide-x border-t border-divider gap-x-4 py-4 pr-4">
          <AssetDetails asset={asset} value={transferableBalance} label={t('assetBalance.transferable')} />
          <AssetDetails asset={asset} value={balance?.frozen} label={t('assetBalance.locked')} />
          <AssetDetails asset={asset} value={balance?.reserved} label={t('assetBalance.reserved')} />
        </dl>
      )}
    </li>
  );
};
