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
// /**
//  * Calculates available amount for transfer based on Polkadot account balance
//  * model
//  *
//  * @param balance - Account balance object containing free, frozen, reserved,
//  *   and ED
//  * @param totalFee - Total fee for the transaction
//  * @param includeExistentialDeposit - If true, allows spending the existential
//  *   deposit (transfer all)
//  *
//  * @returns Available amount that can be transferred (always >= 0)
//  *
//  * @see https://wiki.polkadot.com/learn/learn-account-balances/
//  *
//  * Formula: spendable = free - max(frozen - reserved, ED) - totalFee
//  */
// export const getAvailableAmount = ({
//   balance,
//   totalFee,
//   includeExistentialDeposit,
// }: {
//   balance: Balance | null;
//   totalFee: BN;
//   includeExistentialDeposit: boolean;
// }): BN => {
//   if (!balance) return BN_ZERO;
//
//   // Calculate transferable amount based on mode
//   // holdAndFreezes: free - max(0, frozen - reserved)
//   // legacy: free - frozen
//   let transferable: BN;
//   switch (balance.transferableMode) {
//     case 'holdAndFreezes': {
//       const diff = BN.max(BN_ZERO, balance.frozen.sub(balance.reserved));
//       transferable = balance.free.sub(diff);
//       break;
//     }
//     case 'legacy': {
//       transferable = balance.free.sub(balance.frozen);
//       break;
//     }
//   }
//   transferable = BN.max(BN_ZERO, transferable);
//
//   // Determine what should be deducted from transferable
//   // When includeExistentialDeposit is false: protect ED by subtracting max(reserved, ED)
//   // When includeExistentialDeposit is true: only subtract reserved (allow spending ED)
//   const deductibleDeposit = includeExistentialDeposit ? BN_ZERO : balance.ed;
//   const deductible = BN.max(balance.reserved || BN_ZERO, deductibleDeposit);
//
//   // Calculate final available amount
//   const available = transferable.sub(deductible).sub(totalFee);
//
//   return BN.max(BN_ZERO, available);
// };
