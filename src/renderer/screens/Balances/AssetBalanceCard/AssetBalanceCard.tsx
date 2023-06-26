import cn from 'classnames';
import { KeyboardEvent, MouseEvent } from 'react';

import { Shimmering } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Balance } from '@renderer/domain/balance';
import { useToggle } from '@renderer/shared/hooks';
import { totalAmount, transferableAmount } from '@renderer/shared/utils/balance';
import { KeyboardKey } from '@renderer/shared/utils/constants';
import { AssetIcon, BodyText, IconButton } from '@renderer/components/ui-redesign';
import { BalanceNew } from '@renderer/components/common';
import { HelpText } from '@renderer/components/ui-redesign/Typography';

type DetailProp = { asset: Asset; value?: string; label: string; showShimmer?: boolean };
const AssetBalanceDetail = ({ asset, value, label }: DetailProp) => (
  <div className="flex flex-col flex-1 gap-y-0.5 pl-4">
    <HelpText as="dt" className="text-text-tertiary">
      {label}
    </HelpText>
    <dd>{value ? <BalanceNew value={value} asset={asset} /> : <Shimmering width={150} height={20} />}</dd>
  </div>
);

type Props = {
  asset: Asset;
  balance?: Balance;
  canMakeActions?: boolean;
  onReceiveClick?: () => void;
  onTransferClick?: () => void;
};

const AssetBalanceCard = ({ asset, balance, canMakeActions, onReceiveClick, onTransferClick }: Props) => {
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

  return (
    <li
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={cn('group cursor-pointer bg-block-background-default rounded flex flex-col hover:shadow-card-shadow')}
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
          <AssetBalanceDetail asset={asset} value={transferableBalance} label={t('assetBalance.transferable')} />
          <AssetBalanceDetail asset={asset} value={balance?.frozen} label={t('assetBalance.locked')} />
          <AssetBalanceDetail asset={asset} value={balance?.reserved} label={t('assetBalance.reserved')} />
        </dl>
      )}
    </li>
  );
};

export default AssetBalanceCard;
