import { type BN } from '@polkadot/util';
import { memo } from 'react';
import { Trans } from 'react-i18next';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { AssetBalance } from '@/shared/ui-entities';

type CliffMinVestedTransferErrorProps = {
  minVestedTransfer: BN;
  remainingLockedAmount: string;
  asset: Asset;
};

export const CliffMinVestedTransferError = memo(
  ({ minVestedTransfer, remainingLockedAmount, asset }: CliffMinVestedTransferErrorProps) => {
    const { t } = useI18n();

    return (
      <Trans
        t={t}
        i18nKey="vestedTransfer.errors.csv.fieldErrors.CLIFF_MIN_VESTED_TRANSFER"
        components={{
          minVestedTransfer: (
            <AssetBalance className="text-caption text-inherit" value={minVestedTransfer} asset={asset} showSymbol />
          ),
          remainingLockedAmount: (
            <AssetBalance
              className="text-caption text-inherit"
              value={remainingLockedAmount}
              asset={asset}
              showSymbol
            />
          ),
        }}
      />
    );
  },
);
