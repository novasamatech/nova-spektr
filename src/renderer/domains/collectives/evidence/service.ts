import { hexToU8a } from '@polkadot/util';
import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';

import { type Chain, type HexString, type Transaction, TransactionType } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';
import { type CoreMember } from '../members/types';

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
  const period = periods.minPromotionPeriod.at(member.rank) ?? 1;
  return period;
}

function getDemotionPeriod(member: CoreMember, periods: EvidencePeriods) {
  const period = member.rank === 0 ? periods.offboardTimeout : (periods.demotionPeriod.at(member.rank - 1) ?? 0);
  return period;
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
  getDemotionPeriod,

  createEvidenceTransaction,
  isEvidenceTransaction,
};
