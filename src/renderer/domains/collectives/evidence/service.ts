import { type ApiPromise } from '@polkadot/api';
import { hexToU8a } from '@polkadot/util';
import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';

import { type HexString } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { type CoreMember } from '../members/types';

import { type EvidencePeriods } from './types';

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
  return new URL(`ipfs/${getCidByEvidence(evidence)}`, 'https://subsquare.infura-ipfs.io/');
}

function getProposalAccount(api: ApiPromise, inline: HexString) {
  const proposal = api.registry.createType('Proposal', inline);
  const parsed = pjsSchema.accountId.safeParse(proposal.args.at(0));
  if (parsed.success) {
    return parsed.data;
  }
  return null;
}

function getPromotionPeriod(member: CoreMember, periods: EvidencePeriods) {
  const period = periods.minPromotionPeriod.at(member.rank) ?? 1;
  return pjsSchema.helpers.toBlockHeight(period);
}

function getDemotionPeriod(member: CoreMember, periods: EvidencePeriods) {
  const period = member.rank === 0 ? periods.offboardTimeout : (periods.demotionPeriod.at(member.rank - 1) ?? 1);
  return pjsSchema.helpers.toBlockHeight(period);
}

export const evidenceService = {
  getEvidenceIpfsUrl,
  getCidByEvidence,
  getEvidenceFromCid,
  getProposalAccount,
  getPromotionPeriod,
  getDemotionPeriod,
};
