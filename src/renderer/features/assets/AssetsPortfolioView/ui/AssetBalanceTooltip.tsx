import { Trans } from 'react-i18next';
import { PropsWithChildren } from 'react';

import { useI18n } from '@app/providers';
import { transferableAmount } from '@shared/lib/utils';
import type { AssetBalance as Balance, AssetByChains } from '@shared/core';
import { Shimmering, Tooltip } from '@shared/ui';
import { AssetBalance } from '@entities/asset';

type Props = PropsWithChildren & {
  asset: AssetByChains;
  balance: Balance;
};

export const AssetBalanceTooltip = ({ balance, asset, children }: Props) => {
  const { t } = useI18n();

  return (
    <Tooltip
      content={
        <Trans
          t={t}
          i18nKey="balances.balanceTooltip"
          components={{
            amountFree: (
              <AssetBalance value={transferableAmount(balance)} asset={asset} className="text-white text-help-text" />
            ),
            amountLocked: balance.frozen ? (
              <AssetBalance value={balance.frozen} asset={asset} className="text-white text-help-text" />
            ) : (
              <Shimmering width={50} height={7} className="bg-white inline-block" />
            ),
            amountReserved: balance.reserved ? (
              <AssetBalance value={balance.reserved} asset={asset} className="text-white text-help-text" />
            ) : (
              <Shimmering width={50} height={7} className="bg-white inline-block" />
            ),
          }}
        />
      }
      offsetPx={-60}
    >
      {children}
    </Tooltip>
  );
};
