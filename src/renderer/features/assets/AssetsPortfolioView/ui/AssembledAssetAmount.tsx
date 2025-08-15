import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';

import { type AssetByChains, type PortfolioTokenBalance } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { AssetBalance } from '@/shared/ui-entities';
import { Skeleton, Tooltip } from '@/shared/ui-kit';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';

type Props = PropsWithChildren & {
  asset: AssetByChains;
  balance: PortfolioTokenBalance | null;
};

export const AssembledAssetAmount = ({ balance, asset }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (!balance) {
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
              'border-b border-filter-border px-px transition-colors',
              'hover:rounded-md hover:border-transparent hover:bg-switch-background-inactive',
              'focus:rounded-md focus:border-transparent focus:bg-switch-background-inactive',
            )}
          >
            <AssetBalance value={balance.total} asset={asset} showSymbol={false} />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans
            t={t}
            i18nKey="balances.balanceTooltip"
            components={{
              amountFree: (
                <AssetBalance value={balance.transferable} asset={asset} className="text-help-text text-white" />
              ),
              amountLocked: <AssetBalance value={balance.locked} asset={asset} className="text-help-text text-white" />,
              amountReserved: (
                <AssetBalance value={balance.frozen} asset={asset} className="text-help-text text-white" />
              ),
            }}
          />
        </Tooltip.Content>
      </Tooltip>

      <AssetFiatBalance amount={balance.total} asset={asset} className="w-full truncate text-right indent-2" />
    </div>
  );
};
