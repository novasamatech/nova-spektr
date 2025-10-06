import { BN, BN_ZERO } from '@polkadot/util';

import { type Balance } from '@/shared/core';
import { transferableAmountBN } from '@/shared/lib/utils';

export function getAvailableAmount({
  balance,
  totalFee,
  includeED,
}: {
  balance: Balance | null;
  totalFee: BN;
  includeED: boolean;
}) {
  if (!balance) return BN_ZERO;

  const transferable = transferableAmountBN(balance);
  const deductibleDeposit = includeED ? null : balance?.ed;
  const deductible = BN.max(balance?.reserved || BN_ZERO, deductibleDeposit || BN_ZERO);
  const available = transferable.sub(deductible).sub(totalFee);

  return BN.max(BN_ZERO, available);
}
