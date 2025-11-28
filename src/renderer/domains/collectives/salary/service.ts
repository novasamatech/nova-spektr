import { type BN, BN_ZERO } from '@polkadot/util';

import { type Chain, type Transaction, TransactionType } from '@/shared/core';
import { formatBalance } from '@/shared/lib/utils';
import { type AccountId, type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';
import { type Member } from '../member/types';

import {
  type ClaimStatus,
  type Salaries,
  type SalaryCycle,
  type SalaryCyclePeriod,
  type SalaryInductTransaction,
  type SalaryPayoutTransaction,
  type SalaryRequestTransaction,
} from './types';

/**
 * Special hardcode for USDT formatting - real USDT asset is defined in asset
 * hub chain, but we don't know where to read this relation is code.
 */
function formatSalaryAmount(salary: BN) {
  return `${formatBalance(salary, 6, { shorthands: { K: true } }).formatted} USDT`;
}

function getCurrentPeriod(salaryCycle: SalaryCycle, currentBlock: BlockHeight): SalaryCyclePeriod {
  const cycleEnd = getCycleEnd(salaryCycle);

  // Out of range. Maybe salary cycle index is incorrect
  if (currentBlock < salaryCycle.cycleStart || currentBlock > cycleEnd) {
    return {
      type: 'unknown',
      cycleIndex: salaryCycle.cycleIndex,
    };
  }

  const payoutStart = salaryCycle.cycleStart + salaryCycle.registrationPeriod;

  if (currentBlock >= payoutStart) {
    return {
      type: 'payout',
      left: pjsSchema.helpers.toBlockHeight(cycleEnd - currentBlock),
      until: pjsSchema.helpers.toBlockHeight(cycleEnd),
      cycleIndex: salaryCycle.cycleIndex,
    };
  }

  return {
    type: 'registration',
    left: pjsSchema.helpers.toBlockHeight(payoutStart - currentBlock),
    until: pjsSchema.helpers.toBlockHeight(payoutStart),
    cycleIndex: salaryCycle.cycleIndex,
  };
}

function getCycleEnd(salaryCycle: SalaryCycle) {
  return pjsSchema.helpers.toBlockHeight(
    salaryCycle.cycleStart + salaryCycle.registrationPeriod + salaryCycle.payoutPeriod,
  );
}

function getMemberSalary(member: Member, salaries: Salaries) {
  if (member.rank === 0) {
    return {
      active: BN_ZERO,
      passive: BN_ZERO,
    };
  }
  return {
    active: salaries.active.at(member.rank - 1) ?? BN_ZERO,
    passive: salaries.passive.at(member.rank - 1) ?? BN_ZERO,
  };
}

type SalaryRequestTransactionParams = {
  pallet: CollectivePalletsType;
  account: AnyAccount;
  chain: Chain;
};

function createSalaryRequestTransaction({
  pallet,
  account,
  chain,
}: SalaryRequestTransactionParams): SalaryRequestTransaction {
  return {
    accountId: account.accountId,
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_SALARY_REQUEST,
    args: { pallet },
  };
}

function isSalaryRequestTransaction(transaction: Transaction): transaction is SalaryRequestTransaction {
  return transaction.type === TransactionType.COLLECTIVE_SALARY_REQUEST;
}

type SalaryPayoutTransactionParams = {
  pallet: CollectivePalletsType;
  beneficiary: AccountId | null;
  account: AnyAccount;
  chain: Chain;
};

function createSalaryPayoutTransaction({
  pallet,
  account,
  beneficiary,
  chain,
}: SalaryPayoutTransactionParams): SalaryPayoutTransaction {
  return {
    accountId: account.accountId,
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_SALARY_PAYOUT,
    args: { pallet, beneficiary },
  };
}

function isSalaryPayoutTransaction(transaction: Transaction): transaction is SalaryPayoutTransaction {
  return transaction.type === TransactionType.COLLECTIVE_SALARY_PAYOUT;
}

type SalaryInductTransactionParams = {
  pallet: CollectivePalletsType;
  account: AnyAccount;
  chain: Chain;
};

function createSalaryInductTransaction({
  pallet,
  account,
  chain,
}: SalaryInductTransactionParams): SalaryInductTransaction {
  return {
    accountId: account.accountId,
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_SALARY_INDUCT,
    args: { pallet },
  };
}

function isSalaryInductTransaction(transaction: Transaction): transaction is SalaryInductTransaction {
  return transaction.type === TransactionType.COLLECTIVE_SALARY_INDUCT;
}

function isInducted(claimStatus: ClaimStatus) {
  return claimStatus.type !== 'none';
}

function canRequestSalary(claimStatus: ClaimStatus, period: SalaryCyclePeriod) {
  return period.type === 'registration' && claimStatus.type !== 'none' && claimStatus.lastActive < period.cycleIndex;
}

function canRequestSalaryPayout(claimStatus: ClaimStatus, period: SalaryCyclePeriod) {
  return (
    period.type === 'payout' &&
    ((claimStatus.type === 'registered' && claimStatus.lastActive === period.cycleIndex) ||
      (claimStatus.type === 'nothing' && claimStatus.lastActive < period.cycleIndex))
  );
}

export const salaryService = {
  formatSalaryAmount,

  getCycleEnd,
  getCurrentPeriod,
  getMemberSalary,

  isInducted,

  canRequestSalary,
  canRequestSalaryPayout,

  createSalaryInductTransaction,
  isSalaryInductTransaction,

  createSalaryRequestTransaction,
  isSalaryRequestTransaction,

  createSalaryPayoutTransaction,
  isSalaryPayoutTransaction,
};
