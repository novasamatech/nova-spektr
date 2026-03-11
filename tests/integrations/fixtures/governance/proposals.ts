import { BN } from '@polkadot/util';

import { type OngoingReferendum, type RejectedReferendum } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AggregatedReferendum } from '@/features/governance';
import { polkadotChainId } from '../chain';

/**
 * Ongoing referendum - Root track (most powerful)
 */
export const rootReferendum: AggregatedReferendum<OngoingReferendum> = {
  type: 'Ongoing',
  referendumId: '100',
  track: '0', // Root track
  proposal: {
    type: 'Unknown',
    description: 'System upgrade proposal',
  },
  rawProposal: '0x1234567890abcdef',
  submitted: 1000000,
  submissionDeposit: {
    who: createAccountId(1),
    amount: new BN('100000000000000'),
  },
  decisionDeposit: {
    who: createAccountId(1),
    amount: new BN('500000000000000'),
  },
  inQueue: false,
  enactment: {
    value: 100,
    type: 'After',
  },
  deciding: {
    since: 1000100,
    confirming: null,
  },
  tally: {
    ayes: new BN('10000000000000000'),
    nays: new BN('2000000000000000'),
    support: new BN('12000000000000000'),
  },
  // AggregatedReferendum additional fields
  end: 1100000,
  status: 'Deciding',
  approvalThreshold: {
    value: new BN('500000000000000'),
    passing: true,
    curve: null,
  },
  supportThreshold: {
    value: new BN('300000000000000'),
    passing: true,
    curve: null,
  },
  votedByDelegates: [],
  voting: {
    of: 0,
    votes: [],
  },
} as AggregatedReferendum<OngoingReferendum>;

/**
 * Ongoing referendum - Whitelisted Caller track
 */
export const whitelistedCallerReferendum: AggregatedReferendum<OngoingReferendum> = {
  type: 'Ongoing',
  referendumId: '101',
  track: '1', // Whitelisted Caller
  proposal: {
    type: 'Unknown',
    description: 'Whitelisted function call',
  },
  rawProposal: '0xabcdef1234567890',
  submitted: 1000200,
  submissionDeposit: {
    who: createAccountId(2),
    amount: new BN('50000000000000'),
  },
  decisionDeposit: {
    who: createAccountId(2),
    amount: new BN('250000000000000'),
  },
  inQueue: false,
  enactment: {
    value: 1001000,
    type: 'At',
  },
  deciding: {
    since: 1000300,
    confirming: 1000400,
  },
  tally: {
    ayes: new BN('5000000000000000'),
    nays: new BN('1000000000000000'),
    support: new BN('6000000000000000'),
  },
  // AggregatedReferendum additional fields
  end: 1002000,
  status: 'Passing',
  approvalThreshold: {
    value: new BN('400000000000000'),
    passing: true,
    curve: null,
  },
  supportThreshold: {
    value: new BN('200000000000000'),
    passing: true,
    curve: null,
  },
  votedByDelegates: [],
  voting: {
    of: 0,
    votes: [],
  },
} as AggregatedReferendum<OngoingReferendum>;

/**
 * Ongoing referendum - Treasurer track
 */
export const treasurerReferendum: AggregatedReferendum<OngoingReferendum> = {
  type: 'Ongoing',
  referendumId: '102',
  track: '11', // Treasurer
  proposal: {
    type: 'Spend',
    beneficiary: createAccountId(10),
    amount: new BN('1000000000000000'),
  },
  rawProposal: '0xfedcba9876543210',
  submitted: 1000500,
  submissionDeposit: {
    who: createAccountId(3),
    amount: new BN('100000000000000'),
  },
  decisionDeposit: {
    who: createAccountId(3),
    amount: new BN('500000000000000'),
  },
  inQueue: true,
  enactment: {
    value: 200,
    type: 'After',
  },
  deciding: null,
  tally: {
    ayes: new BN('3000000000000000'),
    nays: new BN('500000000000000'),
    support: new BN('3500000000000000'),
  },
  // AggregatedReferendum additional fields
  end: null,
  status: 'NoDeposit',
  approvalThreshold: {
    value: new BN('600000000000000'),
    passing: false,
    curve: null,
  },
  supportThreshold: {
    value: new BN('350000000000000'),
    passing: false,
    curve: null,
  },
  votedByDelegates: [],
  voting: {
    of: 0,
    votes: [],
  },
} as AggregatedReferendum<OngoingReferendum>;

/**
 * Ongoing referendum - Small Tipper track
 */
export const smallTipperReferendum: AggregatedReferendum<OngoingReferendum> = {
  type: 'Ongoing',
  referendumId: '103',
  track: '13', // Small Tipper
  proposal: {
    type: 'Spend',
    beneficiary: createAccountId(11),
    amount: new BN('100000000000000'),
  },
  rawProposal: '0x1122334455667788',
  submitted: 1000800,
  submissionDeposit: {
    who: createAccountId(4),
    amount: new BN('10000000000000'),
  },
  decisionDeposit: {
    who: createAccountId(4),
    amount: new BN('50000000000000'),
  },
  inQueue: false,
  enactment: {
    value: 50,
    type: 'After',
  },
  deciding: {
    since: 1000900,
    confirming: null,
  },
  tally: {
    ayes: new BN('500000000000000'),
    nays: new BN('100000000000000'),
    support: new BN('600000000000000'),
  },
  // AggregatedReferendum additional fields
  end: 1002500,
  status: 'Deciding',
  approvalThreshold: {
    value: new BN('100000000000000'),
    passing: true,
    curve: null,
  },
  supportThreshold: {
    value: new BN('50000000000000'),
    passing: true,
    curve: null,
  },
  votedByDelegates: [],
  voting: {
    of: 0,
    votes: [],
  },
} as AggregatedReferendum<OngoingReferendum>;

/**
 * Rejected referendum
 */
export const rejectedReferendum: RejectedReferendum = {
  type: 'Rejected',
  referendumId: '99',
  since: 999000,
  submissionDeposit: {
    who: createAccountId(5),
    amount: new BN('100000000000000'),
  },
  decisionDeposit: {
    who: createAccountId(5),
    amount: new BN('500000000000000'),
  },
};

/**
 * Collection of all test referendums
 */
export const testReferendums = [
  rootReferendum,
  whitelistedCallerReferendum,
  treasurerReferendum,
  smallTipperReferendum,
];

/**
 * Referendum with low voter turnout for testing edge cases
 */
export const lowTurnoutReferendum: AggregatedReferendum<OngoingReferendum> = {
  type: 'Ongoing',
  referendumId: '104',
  track: '0',
  proposal: {
    type: 'Unknown',
    description: 'Low turnout proposal',
  },
  rawProposal: '0xaabbccddee',
  submitted: 1001000,
  submissionDeposit: {
    who: createAccountId(6),
    amount: new BN('100000000000000'),
  },
  decisionDeposit: null,
  inQueue: true,
  enactment: {
    value: 100,
    type: 'After',
  },
  deciding: null,
  tally: {
    ayes: new BN('100000000000'),
    nays: new BN('50000000000'),
    support: new BN('150000000000'),
  },
  // AggregatedReferendum additional fields
  end: null,
  status: 'NoDeposit',
  approvalThreshold: {
    value: new BN('500000000000000'),
    passing: false,
    curve: null,
  },
  supportThreshold: {
    value: new BN('300000000000000'),
    passing: false,
    curve: null,
  },
  votedByDelegates: [],
  voting: {
    of: 0,
    votes: [],
  },
} as AggregatedReferendum<OngoingReferendum>;

/**
 * Map of referendums by chain for testing
 */
export const referendumsByChain = {
  [polkadotChainId]: testReferendums,
};
