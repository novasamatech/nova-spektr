import { type ApiPromise } from '@polkadot/api';
import { hexToU8a } from '@polkadot/util';
import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';

import { type BlockHeight, type HexString } from '@/shared/core';
import { assert } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { type CoreMember } from '../members/types';

import { type CurrentMemberPeriod, type EvidencePeriods } from './types';

function getCidByEvidence(evidence: HexString) {
  const SHA_256_CODE = 0x12;

  return CID.createV0(createDigest(SHA_256_CODE, hexToU8a(evidence)))
    .toV1()
    .toString();
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

function getCurrentMembersPeriod(
  member: CoreMember,
  periods: EvidencePeriods,
  currentBlock: BlockHeight,
): CurrentMemberPeriod {
  const memberMinPromotionPeriod = periods.minPromotionPeriod.at(member.rank);
  const memberDemotionPeriod = periods.demotionPeriod.at(member.rank);
  assert(memberMinPromotionPeriod, `Promotion period for rank ${member.rank} not found`);
  assert(memberDemotionPeriod, `Demotion period for rank ${member.rank} not found`);

  if (member.lastPromotion + memberMinPromotionPeriod >= currentBlock) {
    return {
      type: 'Promotion',
      end: pjsSchema.helpers.toBlockHeight(member.lastPromotion + memberMinPromotionPeriod),
      left: pjsSchema.helpers.toBlockHeight(member.lastPromotion + memberMinPromotionPeriod - currentBlock),
    };
  }

  return {
    type: 'Retention',
    end: pjsSchema.helpers.toBlockHeight(member.lastProof + memberDemotionPeriod),
    left: pjsSchema.helpers.toBlockHeight(currentBlock - (member.lastProof + memberDemotionPeriod)),
  };
}

export const evidenceService = {
  getEvidenceIpfsUrl,
  getCidByEvidence,
  getProposalAccount,
  getCurrentMembersPeriod,
};
