import { hexToU8a } from '@polkadot/util';
import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';

import { type Chain, type HexString, type Transaction, TransactionType } from '@/shared/core';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';
import { type CoreMember } from '../member/types';

import { type EvidencePeriods, type EvidenceTransaction } from './types';

function getCidByEvidence(evidence: HexString) {
  const SHA_256_CODE = 0x12;
  return CID.createV0(createDigest(SHA_256_CODE, hexToU8a(evidence)))
    .toV1()
    .toString();
}

function getEvidenceFromCid(cid: string): HexString {
  const digest = CID.parse(cid).toV0().multihash.digest;
  return `0x${Buffer.from(digest).toString('hex')}`;
}

function getEvidenceIpfsUrl(evidence: HexString) {
  return new URL(`/ipfs/${getCidByEvidence(evidence)}`, 'https://subsquare.infura-ipfs.io');
}

function getEvidenceUploadIpfsUrl() {
  return new URL(`/api/nova/ipfs/files`, 'https://collectives.subsquare.io');
}

function getPromotionPeriod(member: CoreMember, periods: EvidencePeriods) {
  const period = periods.minPromotionPeriod.at(member.rank) ?? pjsSchema.helpers.toBlockHeight(1);
  return period;
}

function getBlockUntilNextPropotion(member: CoreMember, periods: EvidencePeriods, currentBlock: BlockHeight) {
  const promotionPeriod = getPromotionPeriod(member, periods);
  const gone = currentBlock - member.lastPromotion;
  return Math.max(0, promotionPeriod - gone);
}

function getDemotionPeriod(member: CoreMember, periods: EvidencePeriods) {
  const period =
    member.rank === 0
      ? periods.offboardTimeout
      : (periods.demotionPeriod.at(member.rank - 1) ?? pjsSchema.helpers.toBlockHeight(1));
  return period;
}

function getBlockUntilDemotion(member: CoreMember, periods: EvidencePeriods, currentBlock: BlockHeight) {
  const demotionPeriod = getDemotionPeriod(member, periods);
  const gone = currentBlock - member.lastProof;
  return Math.max(0, demotionPeriod - gone);
}

function getEndDemotionBlock(member: CoreMember, periods: EvidencePeriods) {
  const demotionPeriod = getDemotionPeriod(member, periods);
  return pjsSchema.helpers.toBlockHeight(demotionPeriod + member.lastProof);
}

type EvidenceTransactionParams = {
  pallet: CollectivePalletsType;
  account: AnyAccount;
  chain: Chain;
  wish: 'Promotion' | 'Retention';
  evidence: HexString;
};

function createEvidenceTransaction({
  pallet,
  account,
  chain,
  wish,
  evidence,
}: EvidenceTransactionParams): EvidenceTransaction {
  return {
    accountId: account.accountId,
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_SUBMIT_EVIDENCE,
    args: { pallet, wish, evidence },
  };
}

function isEvidenceTransaction(transaction: Transaction): transaction is EvidenceTransaction {
  return transaction.type === TransactionType.COLLECTIVE_SUBMIT_EVIDENCE;
}

export const evidenceService = {
  getEvidenceIpfsUrl,
  getEvidenceUploadIpfsUrl,
  getCidByEvidence,
  getEvidenceFromCid,
  getPromotionPeriod,
  getBlockUntilNextPropotion,
  getDemotionPeriod,
  getBlockUntilDemotion,
  getEndDemotionBlock,

  createEvidenceTransaction,
  isEvidenceTransaction,
};
