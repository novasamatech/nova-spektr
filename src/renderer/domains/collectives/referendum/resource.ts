import { type ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';

import { type HexString } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import {
  type FrameSupportPreimagesBounded,
  type ReferendaReferendumInfoConvictionVotingTally,
  type ReferendumId,
} from '@/shared/pallet/referenda';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { type Proposal, type Referendum } from './types';

async function parseProposal(proposal: FrameSupportPreimagesBounded, api: ApiPromise): Promise<Proposal | null> {
  let proposalHex: HexString | null = null;

  if (proposal.type === 'Inline') {
    proposalHex = proposal.data;
  }

  if (proposal.type === 'Lookup') {
    const preimage = await api.query.preimage.preimageFor([proposal.data.hash_, proposal.data.len]);
    if (preimage.isSome) {
      proposalHex = u8aToHex(preimage.value);
    }
  }

  if (nullable(proposalHex)) return null;

  try {
    const struct = api.registry.createType('Proposal', proposalHex);

    // parsing "who" argument for promote/retain
    if (struct.method === 'promote' || struct.method === 'promoteFast' || struct.method === 'approve') {
      const parsed = pjsSchema.accountId.safeParse(struct.args.at(0));

      if (parsed.success) {
        return {
          type: 'Evidence',
          accountId: parsed.data,
        };
      }
    }

    // system.remark('RFC_APPROVE({GITHUB_PR},{DOCUMENT_HASH})') is used for rfc voting.
    if (struct.method === 'remark' || struct.method === 'remarkWithEvent') {
      const parsed = pjsSchema.uint8String.safeParse(struct.args.at(0));
      if (parsed.success) {
        const regexp = /RFC_APPROVE\(([0-9]+),(.+)\)/;
        const match = regexp.exec(parsed.data);
        if (match) {
          const pullRequest = match[1];
          const documentHash = match[2];

          if (pullRequest && documentHash) {
            return {
              type: 'Rfc',
              pullRequest,
              documentHash,
            };
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
    return null;
  }

  return null;
}

async function mapReferendum(
  id: ReferendumId,
  info: ReferendaReferendumInfoConvictionVotingTally,
  api: ApiPromise,
): Promise<Referendum> {
  switch (info.type) {
    case 'Ongoing':
      if (!('bareAyes' in info.data.tally)) {
        throw new Error(`Collective tally is incorrect, got\n${JSON.stringify(info.data.tally, null, 2)}`);
      }

      return {
        id,
        type: info.type,
        track: info.data.track,
        submitted: info.data.submitted,
        proposal: await parseProposal(info.data.proposal, api),
        origin: info.data.origin.type,
        enactment: {
          value: info.data.enactment.data,
          type: info.data.enactment.type,
        },
        inQueue: info.data.inQueue,
        deciding: info.data.deciding,
        tally: info.data.tally,
        decisionDeposit: info.data.decisionDeposit,
        submissionDeposit: info.data.submissionDeposit,
      };
    case 'Approved':
    case 'Rejected':
    case 'Cancelled':
    case 'TimedOut':
      return {
        id,
        type: info.type,
        since: info.data.since,
        submissionDeposit: info.data.submissionDeposit,
        decisionDeposit: info.data.decisionDeposit,
      };
    case 'Killed':
      return {
        id,
        type: info.type,
        since: info.data,
      };
  }
}

export async function mapReferendums(
  list: { id: ReferendumId; info: ReferendaReferendumInfoConvictionVotingTally | null }[],
  api: ApiPromise,
) {
  const value: Referendum[] = [];
  for (const { id, info } of list) {
    if (!info) continue;
    const record = await mapReferendum(id, info, api);
    value.push(record);
  }

  return value;
}
