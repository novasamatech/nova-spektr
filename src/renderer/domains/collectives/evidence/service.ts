import { type ApiPromise } from '@polkadot/api';
import { hexToU8a } from '@polkadot/util';
import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';

import { type HexString } from '@/shared/core';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

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

export const evidenceService = {
  getEvidenceIpfsUrl,
  getCidByEvidence,
  getProposalAccount,
};
