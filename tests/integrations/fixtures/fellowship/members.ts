import { createAccountId } from '@/shared/mocks';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { type CoreMember, type Member } from '@/domains/collectives';
import { senderAccount } from '../account';
import { polkadotChainId } from '../chain';

const bh = pjsSchema.helpers.toBlockHeight;

/**
 * Fellowship member with rank 0 (Candidate)
 */
export const rank0Member: CoreMember = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  rank: 0,
  isActive: true,
  lastPromotion: bh(1000000),
  lastProof: bh(1000000),
};

/**
 * Fellowship member with rank 1
 */
export const rank1Member: CoreMember = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  rank: 1,
  isActive: true,
  lastPromotion: bh(900000),
  lastProof: bh(950000),
};

/**
 * Fellowship member with rank 3 (can vote on most proposals)
 */
export const rank3Member: CoreMember = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  rank: 3,
  isActive: true,
  lastPromotion: bh(800000),
  lastProof: bh(850000),
};

/**
 * Fellowship member with rank 5 (senior member)
 */
export const rank5Member: CoreMember = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  rank: 5,
  isActive: true,
  lastPromotion: bh(600000),
  lastProof: bh(700000),
};

/**
 * Fellowship member with rank 7 (max promotable rank)
 */
export const rank7Member: CoreMember = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  rank: 7,
  isActive: true,
  lastPromotion: bh(400000),
  lastProof: bh(500000),
};

/**
 * Inactive fellowship member
 */
export const inactiveMember: CoreMember = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  rank: 3,
  isActive: false,
  lastPromotion: bh(800000),
  lastProof: bh(850000),
};

/**
 * Member at risk of demotion (old lastProof)
 */
export const demotionRiskMember: CoreMember = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  rank: 2,
  isActive: true,
  lastPromotion: bh(500000),
  lastProof: bh(100000), // Very old proof - at risk
};

/**
 * Member eligible for promotion
 */
export const promotionEligibleMember: CoreMember = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  rank: 2,
  isActive: true,
  lastPromotion: bh(100000), // Long ago - eligible
  lastProof: bh(900000),
};

/**
 * Other fellowship members for list testing
 */
export const otherMember1: Member = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: createAccountId(201),
  rank: 4,
};

export const otherMember2: Member = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: createAccountId(202),
  rank: 2,
};

export const otherMember3: Member = {
  pallet: 'fellowship',
  chainId: polkadotChainId,
  accountId: createAccountId(203),
  rank: 6,
};

/**
 * Collection of test members
 */
export const testMembers: CoreMember[] = [rank0Member, rank1Member, rank3Member, rank5Member, rank7Member];

/**
 * All members including other members
 */
export const allMembers: Member[] = [rank3Member, otherMember1, otherMember2, otherMember3];
