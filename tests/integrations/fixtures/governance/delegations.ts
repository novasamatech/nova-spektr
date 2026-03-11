import { BN } from '@polkadot/util';

import { type DelegatingVoting } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { senderAccount } from '../account';

/**
 * Delegation with None conviction (no lock period)
 */
export const noneConvictionDelegation: DelegatingVoting = {
  type: 'Delegating',
  track: '0', // Root track
  accountId: senderAccount.accountId,
  balance: new BN('1000000000000'), // 1 DOT
  target: createAccountId(100),
  conviction: 'None',
  prior: {
    amount: new BN('0'),
    unlockAt: 0,
  },
};

/**
 * Delegation with Locked1x conviction
 */
export const locked1xDelegation: DelegatingVoting = {
  type: 'Delegating',
  track: '1', // Whitelisted Caller
  accountId: senderAccount.accountId,
  balance: new BN('5000000000000'), // 5 DOT
  target: createAccountId(101),
  conviction: 'Locked1x',
  prior: {
    amount: new BN('0'),
    unlockAt: 0,
  },
};

/**
 * Delegation with Locked2x conviction
 */
export const locked2xDelegation: DelegatingVoting = {
  type: 'Delegating',
  track: '11', // Treasurer
  accountId: senderAccount.accountId,
  balance: new BN('10000000000000'), // 10 DOT
  target: createAccountId(102),
  conviction: 'Locked2x',
  prior: {
    amount: new BN('0'),
    unlockAt: 0,
  },
};

/**
 * Delegation with Locked6x conviction (maximum)
 */
export const locked6xDelegation: DelegatingVoting = {
  type: 'Delegating',
  track: '13', // Small Tipper
  accountId: senderAccount.accountId,
  balance: new BN('20000000000000'), // 20 DOT
  target: createAccountId(103),
  conviction: 'Locked6x',
  prior: {
    amount: new BN('5000000000000'), // Prior lock of 5 DOT
    unlockAt: 2000000, // Unlocks at block 2000000
  },
};

/**
 * Delegation with existing prior lock
 */
export const delegationWithPriorLock: DelegatingVoting = {
  type: 'Delegating',
  track: '0',
  accountId: senderAccount.accountId,
  balance: new BN('15000000000000'), // 15 DOT
  target: createAccountId(104),
  conviction: 'Locked3x',
  prior: {
    amount: new BN('10000000000000'), // Prior lock of 10 DOT
    unlockAt: 1500000,
  },
};

/**
 * Multiple delegations for the same account across different tracks
 */
export const multiTrackDelegations: DelegatingVoting[] = [
  {
    type: 'Delegating',
    track: '0', // Root
    accountId: senderAccount.accountId,
    balance: new BN('5000000000000'),
    target: createAccountId(100),
    conviction: 'Locked2x',
    prior: {
      amount: new BN('0'),
      unlockAt: 0,
    },
  },
  {
    type: 'Delegating',
    track: '1', // Whitelisted Caller
    accountId: senderAccount.accountId,
    balance: new BN('3000000000000'),
    target: createAccountId(100), // Same target
    conviction: 'Locked1x',
    prior: {
      amount: new BN('0'),
      unlockAt: 0,
    },
  },
  {
    type: 'Delegating',
    track: '11', // Treasurer
    accountId: senderAccount.accountId,
    balance: new BN('7000000000000'),
    target: createAccountId(101), // Different target
    conviction: 'Locked3x',
    prior: {
      amount: new BN('0'),
      unlockAt: 0,
    },
  },
];

/**
 * Collection of test delegations
 */
export const testDelegations = [
  noneConvictionDelegation,
  locked1xDelegation,
  locked2xDelegation,
  locked6xDelegation,
  delegationWithPriorLock,
];
