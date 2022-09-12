import cn from 'classnames';
import { KeyboardEvent, MouseEvent } from 'react';

import { Balance as BalanceValue, Button, Icon } from '@renderer/components/ui';
import Shimmering from '@renderer/components/ui/Shimmering/Shimmering';
import { Asset } from '@renderer/domain/asset';
import { Balance } from '@renderer/domain/balance';
import useToggle from '@renderer/hooks/useToggle';
import { total, transferable } from '@renderer/services/balance/common/utils';
import { KeyboardKey } from '@renderer/utils/constants';
import './AssetBalance.css';

type Props = {
  asset: Asset;
  balance: Balance;
  canMakeActions?: boolean;
  onReceiveClick?: () => void;
  onTransferClick?: () => void;
};

const AssetBalance = ({ asset, balance, canMakeActions, onTransferClick, onReceiveClick }: Props) => {
  const [isExpanded, toggleExpanded] = useToggle();

  const onTransfer = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onTransferClick?.();
  };

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
                'relative flex items-center justify-center  border rounded-full w-[34px] h-[34px] box-border',
                balance?.verified ? 'border-shade-30 bg-shade-70' : 'border-alert bg-warning-gradient',
              )}
            >
              {!balance?.verified && (
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
              <>
                <BalanceValue value={total(balance)} precision={asset.precision} /> {asset.symbol}
              </>
            ) : (
              <Shimmering width="200px" height="20px" />
            )}
          </div>
          {canMakeActions && (
            <div className="flex gap-x-2 ml-4">
              <Button
                className={cn(
                  '!px-2 group-hover:opacity-100 focus:opacity-100',
                  isExpanded ? 'opacity-100' : 'opacity-40',
                )}
                variant="fill"
                pallet="primary"
                weight="lg"
                onClick={onTransfer}
              >
                <Icon as="svg" name="arrowUp" size={22} />
              </Button>
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
                <Icon as="svg" name="arrowDown" size={22} />
              </Button>
            </div>
          )}
        </div>
        {isExpanded && (
          <div className="flex divide-x border-t gap-x-6 px-[15px] py-2 text-left">
            <div>
              <div className="text-neutral text-sm font-semibold">Transferable</div>
              <div className="text-neutral-variant text-xs font-bold" data-testid="transferable">
                {balance?.free ? (
                  <>
                    <BalanceValue value={transferable(balance)} precision={asset.precision} /> {asset.symbol}
                  </>
                ) : (
                  <Shimmering width="200px" height="20px" />
                )}
              </div>
            </div>
            <div className="pl-6">
              <div className="text-neutral text-sm font-semibold">Locked</div>
              <div className="text-neutral-variant text-xs font-bold">
                {balance?.frozen ? (
                  <>
                    <BalanceValue value={balance.frozen} precision={asset.precision} /> {asset.symbol}
                  </>
                ) : (
                  <Shimmering width="200px" height="20px" />
                )}
              </div>
            </div>
            <div className="pl-6">
              <div className="text-neutral text-sm font-semibold">Reserved</div>
              <div className="text-neutral-variant text-xs font-bold">
                {balance?.reserved ? (
                  <>
                    <BalanceValue value={balance.reserved} precision={asset.precision} /> {asset.symbol}
                  </>
                ) : (
                  <Shimmering width="200px" height="20px" />
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
