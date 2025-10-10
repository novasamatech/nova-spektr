import { BN_ZERO } from '@polkadot/util';

import { type AssetId } from '@/shared/core';
import { type TransactionValidationBalanceError } from '@/shared/ui-entities';
import { type AnyAccount } from '@/domains/network';

export function combineTotalRequiredFee({
  validationResults,
  account,
  assetId,
  excludeActions,
}: {
  validationResults: TransactionValidationBalanceError[];
  account: AnyAccount;
  assetId: AssetId;
  excludeActions: string[];
}) {
  return validationResults
    .filter(
      (result) =>
        result.account.accountId === account.accountId &&
        result.asset.assetId === assetId &&
        !excludeActions.includes(result.action),
    )
    .map((result) => result.balance.required)
    .reduce((acc, segment) => acc.add(segment), BN_ZERO);
}
