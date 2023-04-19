import cn from 'classnames';
import { KeyboardEvent, MouseEvent } from 'react';

import Paths from '@renderer/routes/paths';
import { Balance as BalanceValue, Button, ButtonLink, Icon, Shimmering } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Balance } from '@renderer/domain/balance';
import { ChainID } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/hooks';
import { createLink } from '@renderer/routes/utils';
import { totalAmount, transferableAmount } from '@renderer/services/balance/common/utils';
import { KeyboardKey } from '@renderer/shared/utils/constants';
import './AssetBalance.css';

type Props = {
  asset: Asset;
  chainId: ChainID;
  balance?: Balance;
  canMakeActions?: boolean;
  onReceiveClick?: () => void;
};

const AssetBalance = ({ asset, chainId, balance, canMakeActions, onReceiveClick }: Props) => {
  const { t } = useI18n();
  const [isExpanded, toggleExpanded] = useToggle();

  const onReceive = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onReceiveClick?.();
  };

  const onWrapperKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (event.currentTarget === event.target && event.key === KeyboardKey.ENTER) {
      toggleExpanded();
    }
  };

  const isVerificationFailed = balance?.free && !balance?.verified;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={cn('group outline-none cursor-pointer', !isExpanded && 'focus:bg-shade-2 hover:bg-shade-2')}
      onClick={toggleExpanded}
      onKeyDown={onWrapperKeyDown}
    >
      <div className={cn('border-2', isExpanded ? 'rounded-2lg border-primary' : 'border-transparent')}>
        <div className="flex items-center h-15 p-[15px] text-xl">
          <div className="flex items-center gap-x-2.5 text-neutral mr-auto">
            <div
              className={cn(
                'relative flex items-center justify-center  border rounded-full w-8.5 h-8.5 box-border',
                isVerificationFailed ? 'border-alert bg-warning-gradient' : 'border-shade-30 bg-shade-70',
              )}
            >
              {isVerificationFailed && (
                <div className="absolute top-0 left-0 w-4 h-4 bg-alert rounded-full flex justify-center items-center">
                  <Icon className="text-neutral-variant" name="shield" size={12} />
                </div>
              )}
              <img src={asset.icon} alt="" width={26} height={26} />
            </div>

            {asset.name}
          </div>
          <div className={cn('font-semibold')} data-testid="balance">
            {balance?.free ? (
              <BalanceValue value={totalAmount(balance)} precision={asset.precision} symbol={asset.symbol} />
            ) : (
              <Shimmering width={200} height={20} />
            )}
          </div>
          {canMakeActions && (
            <div className="flex gap-x-2 ml-4">
              <ButtonLink
                to={createLink(Paths.TRANSFER, { chainId, assetId: asset.assetId })}
                className={cn(
                  '!px-2 group-hover:opacity-100 focus:opacity-100',
                  isExpanded ? 'opacity-100' : 'opacity-40',
                )}
                variant="fill"
                pallet="primary"
                weight="lg"
              >
                <Icon name="arrowUp" size={22} />
              </ButtonLink>
              <Button
                className={cn(
                  '!px-2 group-hover:opacity-100 focus:opacity-100',
                  isExpanded ? 'opacity-100' : 'opacity-40',
                )}
                variant="fill"
                pallet="secondary"
                weight="lg"
                onClick={onReceive}
              >
                <Icon name="arrowDown" size={22} />
              </Button>
            </div>
          )}
        </div>
        {isExpanded && (
          <div className="flex divide-x border-t gap-x-6 px-[15px] py-2 text-left">
            <div>
              <div className="text-neutral text-sm font-semibold">{t('assetBalance.transferable')}</div>
              <div className="text-neutral-variant text-xs font-bold" data-testid="transferable">
                {balance?.free ? (
                  <BalanceValue value={transferableAmount(balance)} precision={asset.precision} symbol={asset.symbol} />
                ) : (
                  <Shimmering width={200} height={20} />
                )}
              </div>
            </div>
            <div className="pl-6">
              <div className="text-neutral text-sm font-semibold">{t('assetBalance.locked')}</div>
              <div className="text-neutral-variant text-xs font-bold">
                {balance?.frozen ? (
                  <BalanceValue value={balance.frozen} precision={asset.precision} symbol={asset.symbol} />
                ) : (
                  <Shimmering width={200} height={20} />
                )}
              </div>
            </div>
            <div className="pl-6">
              <div className="text-neutral text-sm font-semibold">{t('assetBalance.reserved')}</div>
              <div className="text-neutral-variant text-xs font-bold">
                {balance?.reserved ? (
                  <BalanceValue value={balance.reserved} precision={asset.precision} symbol={asset.symbol} />
                ) : (
                  <Shimmering width={200} height={20} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetBalance;
