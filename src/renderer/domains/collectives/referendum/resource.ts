import { type ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';

import { type HexString } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import {
  type FrameSupportPreimagesBounded,
  type ReferendaDecidingStatus,
  type ReferendaReferendumInfoConvictionVotingTally,
  type ReferendumId,
  referendaPallet,
} from '@/shared/pallet/referenda';
import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

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
        } else {
          return {
            type: 'Unknown',
            description: parsed.data,
          };
        }
      }
    }
  } catch (e) {
    console.error(e);
    return null;
  }

  return null;
}

function getEndBlock(
  deciding: ReferendaDecidingStatus | null,
  submitted: BlockHeight,
  decisionPeriod: BlockHeight,
  undecidingTimeout: BlockHeight,
) {
  if (deciding?.confirming) return deciding.confirming;
  if (deciding) return deciding.since + decisionPeriod;

  return submitted + undecidingTimeout;
}

async function mapReferendum({
  id,
  info,
  tracks,
  undecidingTimeout,
  api,
}: {
  id: ReferendumId;
  info: ReferendaReferendumInfoConvictionVotingTally;
  undecidingTimeout: BlockHeight;
  tracks: ReturnType<typeof referendaPallet.consts.tracks>;
  api: ApiPromise;
}): Promise<Referendum> {
  switch (info.type) {
    case 'Ongoing': {
      if (!('bareAyes' in info.data.tally)) {
        throw new Error(`Collective tally is incorrect, got\n${JSON.stringify(info.data.tally, null, 2)}`);
      }

      const track = tracks.find(({ track }) => track === info.data.track);
      if (!track) {
        throw new Error(`Track ${info.data.track} not found in referenda pallet`);
      }

      const proposal = await parseProposal(info.data.proposal, api);
      const ends = getEndBlock(info.data.deciding, info.data.submitted, track.info.decisionPeriod, undecidingTimeout);

      return {
        id,
        type: info.type,
        track: info.data.track,
        submitted: info.data.submitted,
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
        proposal,
        ends,
      };
    }
    case 'Approved':
    case 'Rejected':
    case 'Cancelled':
    case 'TimedOut': {
      return {
        id,
        type: info.type,
        since: info.data.since,
        submissionDeposit: info.data.submissionDeposit,
        decisionDeposit: info.data.decisionDeposit,
      };
    }
    case 'Killed': {
      return {
        id,
        type: info.type,
        since: info.data,
      };
    }
  }
}

export async function mapReferendums(
  list: { id: ReferendumId; info: ReferendaReferendumInfoConvictionVotingTally | null }[],
  api: ApiPromise,
  palletType: CollectivePalletsType,
) {
  const undecidingTimeout = referendaPallet.consts.undecidingTimeout(palletType, api);
  const tracks = referendaPallet.consts.tracks(palletType, api);
  const value: Referendum[] = [];
  for (const { id, info } of list) {
    if (!info) continue;
    const record = await mapReferendum({ id, info, tracks, undecidingTimeout, api });
    value.push(record);
  }

  return value;
}
