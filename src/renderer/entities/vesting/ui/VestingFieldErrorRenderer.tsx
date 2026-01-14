import { type BN } from '@polkadot/util';
import { type ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { AssetBalance } from '@/shared/ui-entities';
import { type ValidationIssue, VestingFieldError } from '../lib/types';

type RenderVestingFieldErrorOptions = {
  issue: ValidationIssue;
  asset: Asset | null;
  minVestedTransfer?: BN | null;
  remainingLockedAmount?: string | null;
};

export function renderVestingFieldError({
  issue,
  asset,
  minVestedTransfer,
  remainingLockedAmount,
}: RenderVestingFieldErrorOptions): ReactNode | null {
  const { t } = useI18n();

  const isMinVestedTransferError =
    issue.message === VestingFieldError.MIN_VESTED_TRANSFER && nonNullable(minVestedTransfer) && nonNullable(asset);

  if (isMinVestedTransferError) {
    return (
      <Trans
        t={t}
        i18nKey="vestedTransfer.errors.csv.fieldErrors.MIN_VESTED_TRANSFER"
        components={{
          minVestedTransfer: (
            <AssetBalance className="text-caption text-inherit" value={minVestedTransfer} asset={asset} showSymbol />
          ),
        }}
      />
    );
  }

  const isCliffMinVestedTransferError =
    issue.message === VestingFieldError.CLIFF_MIN_VESTED_TRANSFER &&
    nonNullable(minVestedTransfer) &&
    nonNullable(asset) &&
    nonNullable(remainingLockedAmount);

  if (isCliffMinVestedTransferError) {
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
  }

  return null;
}
