import { BN } from '@polkadot/util';

import { type OngoingReferendum } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { polkadotChainId } from '../chain';

/**
 * Fellowship promotion referendum (rank 0 → 1)
 */
export const promotionReferendum: OngoingReferendum = {
  type: 'Ongoing',
  referendumId: '1',
  track: '1', // Promotion track for rank 1
  proposal: {
    type: 'Unknown',
    description: 'Promotion evidence for rank advancement',
  },
  rawProposal: '0x1234567890abcdef',
  submitted: 1000000,
  submissionDeposit: {
    who: createAccountId(1),
    amount: new BN('100000000000'),
  },
  decisionDeposit: null,
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
    ayes: new BN('5000000000000'),
    nays: new BN('1000000000000'),
    support: new BN('6000000000000'),
  },
};

/**
 * Fellowship retention referendum
 */
export const retentionReferendum: OngoingReferendum = {
  type: 'Ongoing',
  referendumId: '2',
  track: '2', // Retention track
  proposal: {
    type: 'Unknown',
    description: 'Retention evidence submission',
  },
  rawProposal: '0xabcdef1234567890',
  submitted: 1000200,
  submissionDeposit: {
    who: createAccountId(2),
    amount: new BN('100000000000'),
  },
  decisionDeposit: null,
  inQueue: false,
  enactment: {
    value: 50,
    type: 'After',
  },
  deciding: {
    since: 1000300,
    confirming: null,
  },
  tally: {
    ayes: new BN('3000000000000'),
    nays: new BN('500000000000'),
    support: new BN('3500000000000'),
  },
};

/**
 * RFC (Request for Comments) referendum
 */
export const rfcReferendum: OngoingReferendum = {
  type: 'Ongoing',
  referendumId: '3',
  track: '10', // RFC track
  proposal: {
    type: 'Unknown',
    description: 'Technical RFC proposal',
  },
  rawProposal: '0xfedcba0987654321',
  submitted: 1000500,
  submissionDeposit: {
    who: createAccountId(3),
    amount: new BN('50000000000'),
  },
  decisionDeposit: {
    who: createAccountId(3),
    amount: new BN('200000000000'),
  },
  inQueue: false,
  enactment: {
    value: 200,
    type: 'After',
  },
  deciding: {
    since: 1000600,
    confirming: 1000700,
  },
  tally: {
    ayes: new BN('8000000000000'),
    nays: new BN('2000000000000'),
    support: new BN('10000000000000'),
  },
};

/**
 * Whitelist referendum
 */
export const whitelistReferendum: OngoingReferendum = {
  type: 'Ongoing',
  referendumId: '4',
  track: '11', // Whitelist track
  proposal: {
    type: 'Unknown',
    description: 'Whitelist call proposal',
  },
  rawProposal: '0x1122334455667788',
  submitted: 1000800,
  submissionDeposit: {
    who: createAccountId(4),
    amount: new BN('100000000000'),
  },
  decisionDeposit: {
    who: createAccountId(4),
    amount: new BN('500000000000'),
  },
  inQueue: true,
  enactment: {
    value: 1002000,
    type: 'At',
  },
  deciding: null,
  tally: {
    ayes: new BN('2000000000000'),
    nays: new BN('100000000000'),
    support: new BN('2100000000000'),
  },
};

/**
 * Referendum with low rank proposer (for voting eligibility tests)
 */
export const lowRankProposerReferendum: OngoingReferendum = {
  type: 'Ongoing',
  referendumId: '5',
  track: '1',
  proposal: {
    type: 'Unknown',
    description: 'Proposal from rank 0 member',
  },
  rawProposal: '0xaabbccddee',
  submitted: 1001000,
  submissionDeposit: {
    who: createAccountId(100), // Rank 0 proposer
    amount: new BN('100000000000'),
  },
  decisionDeposit: null,
  inQueue: false,
  enactment: {
    value: 100,
    type: 'After',
  },
  deciding: {
    since: 1001100,
    confirming: null,
  },
  tally: {
    ayes: new BN('1000000000000'),
    nays: new BN('200000000000'),
    support: new BN('1200000000000'),
  },
};

/**
 * Referendum with high rank proposer (for voting eligibility tests)
 */
export const highRankProposerReferendum: OngoingReferendum = {
  type: 'Ongoing',
  referendumId: '6',
  track: '5', // Higher rank track
  proposal: {
    type: 'Unknown',
    description: 'Proposal from rank 5 member',
  },
  rawProposal: '0x99887766554433',
  submitted: 1001200,
  submissionDeposit: {
    who: createAccountId(105), // Rank 5 proposer
    amount: new BN('100000000000'),
  },
  decisionDeposit: null,
  inQueue: false,
  enactment: {
    value: 100,
    type: 'After',
  },
  deciding: {
    since: 1001300,
    confirming: null,
  },
  tally: {
    ayes: new BN('500000000000'),
    nays: new BN('100000000000'),
    support: new BN('600000000000'),
  },
};

/**
 * Collection of test referendums
 */
export const fellowshipTestReferendums = [promotionReferendum, retentionReferendum, rfcReferendum, whitelistReferendum];

/**
 * Referendums by chain
 */
export const fellowshipReferendumsByChain = {
  [polkadotChainId]: fellowshipTestReferendums,
};
