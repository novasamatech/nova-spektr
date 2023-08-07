import cn from 'classnames';
import { KeyboardEvent, MouseEvent } from 'react';

import { Shimmering, BodyText, IconButton } from '@renderer/shared/ui';
import { Asset, Balance, AssetBalance, AssetDetails, AssetIcon } from '@renderer/entities/asset';
import { useToggle } from '@renderer/shared/lib/hooks';
import { totalAmount, transferableAmount, KeyboardKey } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';

type Props = {
  asset: Asset;
  balance?: Balance;
  canMakeActions?: boolean;
  onReceiveClick?: () => void;
  onTransferClick?: () => void;
};

export const AssetCard = ({ asset, balance, canMakeActions, onReceiveClick, onTransferClick }: Props) => {
  const { t } = useI18n();

  const [isExpanded, toggleExpanded] = useToggle();

  const onReceive = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onReceiveClick?.();
  };

  const onTransfer = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onTransferClick?.();
  };

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
      className={cn(
        'flex flex-col group cursor-pointer bg-block-background-default rounded',
        'transition-shadow hover:shadow-card-shadow focus:shadow-card-shadow',
      )}
      onClick={toggleExpanded}
      onKeyDown={onWrapperKeyDown}
    >
      <div className="flex items-center py-1.5 px-2">
        <div className="flex items-center gap-x-2 px-2 py-1  mr-auto">
          <AssetIcon src={asset.icon} name={asset.name} />
          <BodyText>{asset.name}</BodyText>
        </div>
        {balance?.free ? (
          <AssetBalance value={totalAmount(balance)} asset={asset} />
        ) : (
          <Shimmering width={82} height={20} />
        )}
        {canMakeActions && (
          <div className="flex gap-x-2 ml-3">
            <IconButton name="sendArrow" size={20} onClick={onTransfer} />
            <IconButton name="receiveArrow" size={20} onClick={onReceive} />
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
