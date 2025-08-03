import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';

import { type AssetByChains, type AssetBalance as Balance } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, totalAmount, transferableAmount } from '@/shared/lib/utils';
import { AssetBalance } from '@/shared/ui-entities';
import { Skeleton, Tooltip } from '@/shared/ui-kit';
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
      <div className="flex w-[100px] flex-col items-end gap-y-1">
        <Skeleton width={20} height={4} />
        {fiatFlag && <Skeleton width={14} height={4} />}
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
              'border-filter-border border-b px-px transition-colors',
              'hover:bg-switch-background-inactive hover:rounded-md hover:border-transparent',
              'focus:bg-switch-background-inactive focus:rounded-md focus:border-transparent',
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
                <div className="rounded-2lg inline-block bg-white">
                  <Skeleton width={12} height={1.5} />
                </div>
              ),
              amountReserved: balance.reserved ? (
                <AssetBalance value={balance.reserved} asset={asset} className="text-help-text text-white" />
              ) : (
                <div className="rounded-2lg inline-block bg-white">
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
