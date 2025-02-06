import { type BN, BN_ZERO } from '@polkadot/util';

import { type Chain, TransactionType } from '@/shared/core';
import { formatBalance, toAddress } from '@/shared/lib/utils';
import { type AccountId, type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';
import { type Member } from '../members/types';

import {
  type ClaimStatus,
  type Salaries,
  type SalaryCycle,
  type SalaryCyclePeriod,
  type SalaryPayoutTransaction,
  type SalaryRequestTransaction,
} from './types';

/**
 * Special hardcode for USDT formatting - real USDT asset is defined in asset
 * hub chain, but we don't know where to read this relation is code.
 */
function formatSalaryAmount(salary: BN) {
  return `${formatBalance(salary, 6, { K: true }).formatted} USDT`;
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
  return {
    active: salaries.active.at(Math.max(0, member.rank - 1)) ?? BN_ZERO,
    passive: salaries.passive.at(Math.max(0, member.rank - 1)) ?? BN_ZERO,
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
    address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_SALARY_REQUEST,
    args: { pallet },
  };
}

function isClaimantActiveInCurrentCycle(claimStatus: ClaimStatus, period: SalaryCyclePeriod) {
  return claimStatus.lastActive === period.cycleIndex;
}

function isClaimantRequestedSalary(claimStatus: ClaimStatus, period: SalaryCyclePeriod) {
  return isClaimantActiveInCurrentCycle(claimStatus, period) && claimStatus && claimStatus.type === 'registered';
}

function isClaimantRequestedSalaryPayout(claimStatus: ClaimStatus, period: SalaryCyclePeriod) {
  return isClaimantActiveInCurrentCycle(claimStatus, period) && claimStatus && claimStatus.type === 'payout';
}

function canRequestSalary(claimStatus: ClaimStatus, period: SalaryCyclePeriod) {
  return (
    isClaimantActiveInCurrentCycle(claimStatus, period) &&
    period.type === 'registration' &&
    claimStatus.type !== 'registered'
  );
}

function canRequestSalaryPayout(claimStatus: ClaimStatus, period: SalaryCyclePeriod) {
  return (
    isClaimantActiveInCurrentCycle(claimStatus, period) && period.type === 'payout' && claimStatus.type !== 'payout'
  );
}

type SalaryPayoutTransactionParams = {
  pallet: CollectivePalletsType;
  account: AnyAccount;
  chain: Chain;
  beneficiary: AccountId | null;
};

function createSalaryPayoutTransaction({
  pallet,
  account,
  chain,
  beneficiary,
}: SalaryPayoutTransactionParams): SalaryPayoutTransaction {
  return {
    address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_SALARY_REQUEST,
    args: { pallet, beneficiary },
  };
}

export const salaryService = {
  formatSalaryAmount,

  getCycleEnd,
  getCurrentPeriod,
  getMemberSalary,

  isClaimantActiveInCurrentCycle,
  isClaimantRequestedSalary,
  isClaimantRequestedSalaryPayout,

  canRequestSalary,
  canRequestSalaryPayout,

  createSalaryRequestTransaction,
  createSalaryPayoutTransaction,
};
