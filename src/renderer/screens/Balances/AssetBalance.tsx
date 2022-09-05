import cn from 'classnames';
import { useState } from 'react';

import { formatBalance, transferable, total, locked } from '@renderer/services/balance/common/utils';
import { Asset } from '@renderer/services/network/common/types';
import Shimmering from '@renderer/components/ui/Shimmering/Shimmering';
import { Balance } from '@renderer/domain/balance';

type Props = {
  asset: Asset;
  balance: Balance;
};

const AssetBalance = ({ asset, balance }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      role="button"
      aria-expanded={isExpanded}
      className={cn('outline-none', !isExpanded && 'focus:bg-shade-5')}
    >
      <div
        className={cn(
          'hover:bg-shade-5 cursor-pointer border-2',
          isExpanded ? 'rounded-2lg border-primary' : 'border-transparent',
        )}
      >
        <div className="flex items-center justify-between gap-7.5 h-[60px] p-[15px] text-xl ">
          <div className="flex items-center gap-x-2.5 text-neutral">
            <div className="flex items-center justify-center bg-shade-40 border border-white border-opacity-75 rounded-full w-[34px] h-[34px] box-border">
              <img src={asset.icon} alt="" width={26} height={26} />
            </div>
            {asset.name}
          </div>
          <div className={cn('font-semibold', !balance?.verified && 'text-shade-50')} data-testid="balance">
            {balance?.free ? (
              `${formatBalance(total(balance), asset.precision)} ${asset.symbol}`
            ) : (
              <Shimmering width="200px" height="20px" />
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="flex divide-x gap-6 px-[15px] py-2 text-left">
            <div>
              <div className="text-neutral text-sm font-semibold">Transferable</div>
              <div className="text-neutral-variant text-xs font-bold" data-testid="transferable">
                {balance?.free ? (
                  `${formatBalance(transferable(balance), asset.precision)} ${asset.symbol}`
                ) : (
                  <Shimmering width="200px" height="20px" />
                )}
              </div>
            </div>
            <div className="pl-6">
              <div className="text-neutral text-sm font-semibold">Locked</div>
              <div className="text-neutral-variant text-xs font-bold">
                {balance?.frozen ? (
                  `${formatBalance(locked(balance), asset.precision)} ${asset.symbol}`
                ) : (
                  <Shimmering width="200px" height="20px" />
                )}
              </div>
            </div>
            <div className="pl-6">
              <div className="text-neutral text-sm font-semibold">Reserved</div>
              <div className="text-neutral-variant text-xs font-bold">
                {balance?.reserved ? (
                  `${formatBalance(balance.reserved || '0', asset.precision)} ${asset.symbol}`
                ) : (
                  <Shimmering width="200px" height="20px" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export default AssetBalance;
