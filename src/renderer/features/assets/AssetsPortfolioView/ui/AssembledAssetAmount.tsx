import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import { type AssetByChains, type AssetBalance as Balance } from '@shared/core';
import { totalAmount, transferableAmount } from '@shared/lib/utils';
import { Shimmering, Tooltip } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance, priceProviderModel } from '@entities/price';

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
        <Shimmering width={82} height={20} />
        {fiatFlag && <Shimmering width={56} height={18} />}
      </div>
    );
  }

  return (
    <>
      <Tooltip
        content={
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
                <Shimmering width={50} height={7} className="inline-block bg-white" />
              ),
              amountReserved: balance.reserved ? (
                <AssetBalance value={balance.reserved} asset={asset} className="text-help-text text-white" />
              ) : (
                <Shimmering width={50} height={7} className="inline-block bg-white" />
              ),
            }}
          />
        }
        offsetPx={-75}
      >
        <AssetBalance
          value={totalAmount(balance)}
          asset={asset}
          showSymbol={false}
          className="border-b border-filter-border hover:bg-switch-background-inactive"
        />
      </Tooltip>
      <AssetFiatBalance amount={totalAmount(balance)} asset={asset} />
    </>
  );
};
