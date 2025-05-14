import { type ApiPromise } from '@polkadot/api';
import { BN, u8aToHex } from '@polkadot/util';

import { type HexString, type Referendum, type TrackId, type TrackInfo, type VotingCurve } from '@/shared/core';
import { type Proposal } from '@/shared/core/types/referendum';
import { nullable, toAccountId } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import {
  type FrameSupportPreimagesBounded,
  type ReferendaCurve,
  type ReferendaReferendumInfoConvictionVotingTally,
  type ReferendumId,
  referendaPallet,
} from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const governanceService = {
  getReferendums,
  getTrackLocks,
  getTracks,
  mapReferendum,
};

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

    if (struct.method === 'spendLocal' && struct.section === 'treasury') {
      const amount = String(struct.args.at(0)?.toHuman()).replaceAll(',', '');
      const beneficiary = struct.args.at(1)?.toJSON() as { id: string };

      const parsedBeneficiary = toAccountId(beneficiary.id);

      if (amount && parsedBeneficiary) {
        return {
          type: 'Spend',
          amount: new BN(amount),
          beneficiary: parsedBeneficiary,
        };
      }
    }
  } catch (e) {
    console.error(e);
    return null;
  }

  return null;
}

async function mapReferendum(
  referendumId: string,
  info: ReferendaReferendumInfoConvictionVotingTally,
  api: ApiPromise,
): Promise<Referendum> {
  switch (info.type) {
    case 'Ongoing':
      if (!('support' in info.data.tally)) {
        throw new Error('Tally is incorrect');
      }

      // eslint-disable-next-line no-case-declarations
      const proposal = await parseProposal(info.data.proposal, api);

      if (proposal) {
        console.log('eblo', { proposal, id: referendumId });
      }
      return {
        referendumId,
        type: info.type,
        track: info.data.track.toString(),
        proposal,
        submitted: info.data.submitted,
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
        type: info.type,
        referendumId,
        since: info.data.since,
        submissionDeposit: info.data.submissionDeposit,
        decisionDeposit: info.data.decisionDeposit,
      };
    case 'Killed':
      return {
        type: info.type,
        referendumId,
        since: info.data,
      };
  }
}

async function getReferendums(api: ApiPromise, ids?: ReferendumId[]): Promise<Referendum[]> {
  const referendums = await referendaPallet.storage.referendumInfoFor('governance', api, ids);

  const result: Referendum[] = [];

  for (const { id, info } of referendums) {
    if (!info) continue;

    result.push(await mapReferendum(id.toString(), info, api));
  }

  return result;
}

async function getTrackLocks(api: ApiPromise, accounts: AccountId[]): Promise<Record<AccountId, Record<TrackId, BN>>> {
  const tuples = await convictionVotingPallet.storage.classLocksFor(api, accounts);
  const result: Record<AccountId, Record<TrackId, BN>> = {};

  for (const [index, locks] of tuples.entries()) {
    const lockData = locks.reduce<Record<TrackId, BN>>((acc, lock) => {
      acc[lock.track] = lock.amount;

      return acc;
    }, {});

    result[accounts[index]] = lockData;
  }

  return result;
}

function getTracks(api: ApiPromise): Record<TrackId, TrackInfo> {
  const tracks = referendaPallet.consts.tracks('governance', api);

  const result: Record<TrackId, TrackInfo> = {};

  for (const { id, info } of tracks) {
    const minApproval = mapCurve(info.minApproval);
    const minSupport = mapCurve(info.minSupport);

    result[id.toString()] = {
      name: info.name,
      maxDeciding: info.maxDeciding,
      decisionDeposit: info.decisionDeposit,
      preparePeriod: info.preparePeriod,
      decisionPeriod: info.decisionPeriod,
      minApproval,
      minSupport,
    };
  }

  return result;
}

const mapCurve = (value: ReferendaCurve): VotingCurve => {
  switch (value.type) {
    case 'LinearDecreasing':
      return {
        type: 'LinearDecreasing',
        length: value.data.length,
        floor: value.data.floor,
        ceil: value.data.ceil,
      };
    case 'SteppedDecreasing':
      return {
        type: 'SteppedDecreasing',
        begin: value.data.begin,
        end: value.data.end,
        period: value.data.period,
        step: value.data.step,
      };
    case 'Reciprocal':
      return {
        type: 'Reciprocal',
        factor: value.data.factor,
        xOffset: value.data.xOffset,
        yOffset: value.data.yOffset,
      };
  }
};
