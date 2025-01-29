import { type Chain, TransactionType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId, type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';

import { type SalaryCycleStatus, type SalaryPayoutTransaction, type SalaryRequestTransaction } from './types';

function getCurrentPeriod(status: SalaryCycleStatus, currentBlock: BlockHeight) {
  const cycleEnd = getCycleEnd(status);

  if (currentBlock < status.cycleStart || currentBlock > cycleEnd) {
    return {
      type: 'unknown',
      cycleIndex: status.cycleIndex,
    } as const;
  }

  const payoutStart = status.cycleStart + status.registrationPeriod;

  if (currentBlock >= payoutStart) {
    return {
      type: 'payout',
      left: pjsSchema.helpers.toBlockHeight(cycleEnd - currentBlock),
      until: pjsSchema.helpers.toBlockHeight(cycleEnd),
      cycleIndex: status.cycleIndex,
    } as const;
  }

  return {
    type: 'registration',
    left: pjsSchema.helpers.toBlockHeight(payoutStart - currentBlock),
    until: pjsSchema.helpers.toBlockHeight(payoutStart),
    cycleIndex: status.cycleIndex,
  } as const;
}

function getCycleEnd(status: SalaryCycleStatus) {
  return pjsSchema.helpers.toBlockHeight(status.cycleStart + status.registrationPeriod + status.payoutPeriod);
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
  getCycleEnd,
  getCurrentPeriod,

  createSalaryRequestTransaction,
  createSalaryPayoutTransaction,
};
