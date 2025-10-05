import { BN_ZERO } from '@polkadot/util';

import { type AssetId } from '@/shared/core';
import { type TransactionValidationBalanceError } from '@/shared/ui-entities';

export function combineTotalRequiredFee({
  validationResults,
  assetId,
  excludeActions,
}: {
  validationResults: TransactionValidationBalanceError[];
  assetId: AssetId;
  excludeActions: string[];
}) {
  return validationResults
    .filter((result) => result.asset.assetId === assetId && !excludeActions.includes(result.action))
    .map((result) => result.balance.required)
    .reduce((acc, segment) => acc.add(segment), BN_ZERO);
}
