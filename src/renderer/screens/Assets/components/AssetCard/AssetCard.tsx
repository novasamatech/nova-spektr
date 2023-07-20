import cn from 'classnames';
import { KeyboardEvent, MouseEvent } from 'react';

import { Shimmering } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Balance } from '@renderer/domain/balance';
import { useToggle } from '@renderer/shared/hooks';
import { totalAmount, transferableAmount } from '@renderer/shared/utils/balance';
import { KeyboardKey } from '@renderer/shared/utils/constants';
import { AssetIcon, BodyText, IconButton } from '@renderer/components/ui-redesign';
import { BalanceNew } from '@renderer/components/common';
import { AssetDetails } from '../AssetDetails/AssetDetails';
import { useI18n } from '@renderer/context/I18nContext';

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
          <BalanceNew value={totalAmount(balance)} asset={asset} />
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
