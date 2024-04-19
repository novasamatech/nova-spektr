import { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { BodyText, Icon, Shimmering } from '@shared/ui';
import { AssetBalance, AssetDetails, AssetIcon } from '@entities/asset';
import { useToggle } from '@shared/lib/hooks';
import { cnTw, KeyboardKey, totalAmount, transferableAmount } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { Paths, createLink } from '@shared/routes';
import { ChainId, Asset, Balance } from '@shared/core';
import { TokenPrice } from '@entities/price/ui/TokenPrice';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { priceProviderModel } from '@entities/price';
import { CheckPermission, OperationType, walletModel } from '@entities/wallet';

type Props = {
  chainId: ChainId;
  asset: Asset;
  balance?: Balance;
};

export const AssetCard = ({ chainId, asset, balance }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const activeWallet = useUnit(walletModel.$activeWallet);

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
            <div className="flex flex-col gap-y-1 items-end">
              <Shimmering width={82} height={20} />
              {fiatFlag && <Shimmering width={56} height={18} />}
            </div>
          )}
        </div>
        <div className="flex gap-x-2 ml-3">
          <CheckPermission operationType={OperationType.TRANSFER} wallet={activeWallet} accounts={activeAccounts}>
            <Link
              to={createLink(Paths.TRANSFER_ASSET, {}, { chainId: [chainId], assetId: [asset.assetId] })}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="sendArrow" size={20} />
            </Link>
          </CheckPermission>
          <CheckPermission operationType={OperationType.RECEIVE} wallet={activeWallet} accounts={activeAccounts}>
            <Link
              to={createLink(Paths.RECEIVE_ASSET, {}, { chainId: [chainId], assetId: [asset.assetId] })}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="receiveArrow" size={20} />
            </Link>
          </CheckPermission>
        </div>
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
