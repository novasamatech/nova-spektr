import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';

import { type AssetByChains, type AssetBalance as Balance } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, totalAmount, transferableAmount } from '@/shared/lib/utils';
import { Skeleton, Tooltip } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';

type Props = PropsWithChildren & {
  asset: AssetByChains;
  balance?: Balance;
};

export const AssembledAssetAmount = ({ balance, asset }: Props) => {
  const { t } = useI18n();
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (!balance?.free) {
    return (
      <div className="flex flex-col items-end gap-y-1">
        <Skeleton width={20} height={5} />
        {fiatFlag && <Skeleton width={14} height={5} />}
      </div>
    );
  }

  return (
    <div className="flex w-[100px] flex-col items-end">
      <Tooltip>
        <Tooltip.Trigger>
          <div
            tabIndex={0}
            className={cnTw(
              'border-b border-filter-border px-[1px] transition-colors',
              'hover:rounded-md hover:border-transparent hover:bg-switch-background-inactive',
              'focus:rounded-md focus:border-transparent focus:bg-switch-background-inactive',
            )}
          >
            <AssetBalance value={totalAmount(balance)} asset={asset} showSymbol={false} />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans
            t={t}
            i18nKey="balances.balanceTooltip"
            components={{
              amountFree: (
                <AssetBalance value={transferableAmount(balance)} asset={asset} className="text-help-text text-white" />
              ),
              amountLocked: balance.frozen ? (
                <AssetBalance value={balance.frozen} asset={asset} className="text-help-text text-white" />
              ) : (
                <div className="inline-block rounded-2lg bg-white">
                  <Skeleton width={12} height={1.5} />
                </div>
              ),
              amountReserved: balance.reserved ? (
                <AssetBalance value={balance.reserved} asset={asset} className="text-help-text text-white" />
              ) : (
                <div className="inline-block rounded-2lg bg-white">
                  <Skeleton width={12} height={1.5} />
                </div>
              ),
            }}
          />
        </Tooltip.Content>
      </Tooltip>

      <AssetFiatBalance amount={totalAmount(balance)} asset={asset} />
    </div>
  );
};
