import {AccountId} from "@shared/core";


export interface AmountReduction {

  reductionFor(accountId: AccountId): bigint

  totalReduction(): bigint
}

export interface AmountReductionBuilder {

  addReductionAmount(payer: AccountId, amount: bigint): void

  build(): AmountReduction
}

export function buildAmountReduction(): AmountReductionBuilder {
  const amountByAccount: Record<AccountId, bigint> = {}
  let total: bigint = BigInt(0)

  const addReductionAmount = (payer: AccountId, amount: bigint) => {
    const currentAmount = amountByAccount[payer] || BigInt(0)
    amountByAccount[payer] = currentAmount + amount
    total += amount
  }

  const build = () => createAmountReduction(amountByAccount, total)

  return {
    addReductionAmount,
    build
  }
}

function createAmountReduction(
  amountByAccount:  Record<AccountId, bigint>,
  total: bigint
): AmountReduction {
  return {
    reductionFor(accountId: AccountId): bigint {
      return amountByAccount[accountId] || BigInt(0)
    },
    totalReduction(): bigint {
      return total
    }
  }
}
