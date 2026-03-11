import { BN } from '@polkadot/util';

import { createAccountId } from '@/shared/mocks';
import { type ClaimStatus } from '@/domains/collectives/salary/types';
import { senderAccount } from '../account';

/**
 * Salary cycle in registration period
 */
export const registrationPeriodCycle = {
  cycleIndex: 10,
  cycleStart: 1000000,
  budget: new BN('100000000000000'), // 100 DOT budget
  totalRegistrations: 50,
  totalUnregisteredPaid: 20,
};

/**
 * Salary cycle in payout period
 */
export const payoutPeriodCycle = {
  cycleIndex: 10,
  cycleStart: 900000,
  budget: new BN('100000000000000'),
  totalRegistrations: 75,
  totalUnregisteredPaid: 30,
};

/**
 * Registration period info
 */
export const registrationPeriod = {
  type: 'registration' as const,
  cycleIndex: 10,
  periodStart: 1000000,
  periodEnd: 1050000,
  blocksRemaining: 25000,
};

/**
 * Payout period info
 */
export const payoutPeriod = {
  type: 'payout' as const,
  cycleIndex: 10,
  periodStart: 1050000,
  periodEnd: 1100000,
  blocksRemaining: 30000,
};

/**
 * Claimant status - not inducted
 */
export const notInductedStatus: ClaimStatus = {
  type: 'none',
  lastActive: 0,
};

/**
 * Claimant status - inducted but not registered
 */
export const inductedNotRegisteredStatus: ClaimStatus = {
  type: 'nothing',
  lastActive: 9,
};

/**
 * Claimant status - registered for current cycle
 */
export const registeredStatus: ClaimStatus = {
  type: 'registered',
  amount: new BN('5000000000000'),
  lastActive: 10, // Current cycle index
};

/**
 * Claimant status - attempted payout
 */
export const payoutAttemptedStatus: ClaimStatus = {
  type: 'payout',
  registered: new BN('10'),
  amount: new BN('5000000000000'), // 5 DOT
  lastActive: 10,
};

/**
 * Salary amounts by rank (in USDT equivalent - planck units)
 */
export const salaryByRank = {
  0: { active: new BN('0'), passive: new BN('0') }, // Candidates don't get salary
  1: { active: new BN('1000000000'), passive: new BN('500000000') }, // 1000 USDT / 500 USDT
  2: { active: new BN('1500000000'), passive: new BN('750000000') },
  3: { active: new BN('2500000000'), passive: new BN('1250000000') },
  4: { active: new BN('4000000000'), passive: new BN('2000000000') },
  5: { active: new BN('6000000000'), passive: new BN('3000000000') },
  6: { active: new BN('8000000000'), passive: new BN('4000000000') },
  7: { active: new BN('10000000000'), passive: new BN('5000000000') }, // 10000 USDT / 5000 USDT
};

/**
 * Active member salary info (rank 3)
 */
export const activeMemberSalary = {
  active: new BN('2500000000'), // 2500 USDT
  passive: new BN('1250000000'), // 1250 USDT
};

/**
 * Inactive member salary info (rank 3)
 */
export const inactiveMemberSalary = {
  active: new BN('2500000000'),
  passive: new BN('1250000000'),
};

/**
 * Beneficiary account for salary payout
 */
export const beneficiaryAccount = createAccountId(300);

/**
 * Default beneficiary (same as member account)
 */
export const defaultBeneficiary = senderAccount.accountId;
