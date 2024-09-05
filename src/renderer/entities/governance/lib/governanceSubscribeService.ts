import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';

import {
  type AccountVote,
  type Address,
  type Referendum,
  type ReferendumId,
  type TrackId,
  type Voting,
  type VotingMap,
} from '@/shared/core';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { toAddress } from '@shared/lib/utils';
import { convictionVotingPallet } from '@shared/pallet/convictionVoting';

import { governanceService } from './governanceService';

export const governanceSubscribeService = {
  subscribeReferendums,
  subscribeTrackLocks,
  subscribeVotingFor,
};

function subscribeTrackLocks(
  api: ApiPromise,
  addresses: Address[],
  callback: (res?: Record<Address, Record<TrackId, BN>>) => void,
): () => void {
  const unsubscribe = api.query.convictionVoting.classLocksFor.multi(addresses, (tuples) => {
    const result: Record<Address, Record<TrackId, BN>> = {};

    for (const [index, locks] of tuples.entries()) {
      const lockData = locks.reduce<Record<TrackId, BN>>((acc, lock) => {
        acc[lock[0].toString()] = lock[1].toBn();

        return acc;
      }, {});

      result[addresses[index]] = lockData;
    }
    callback(result);
  });

  return () => {
    unsubscribe.then((fn) => fn());
  };
}

function subscribeVotingFor(
  api: ApiPromise,
  tracksIds: TrackId[],
  addresses: Address[],
  callback: (res?: VotingMap) => void,
) {
  const tuples = addresses.flatMap((address) => tracksIds.map((trackId) => [address, trackId] as const));

  return convictionVotingPallet.storage.subscribeVotingFor(api, tuples, (votings) => {
    const result = addresses.reduce<Record<Address, Record<TrackId, Voting>>>((acc, address) => {
      acc[address] = {};

      return acc;
    }, {});

    for (const [index, convictionVoting] of votings.entries()) {
      const address = tuples[index]?.[0];
      const trackId = tuples[index]?.[1];
      if (!address || !trackId) {
        continue;
      }

      switch (convictionVoting.type) {
        case 'Delegating': {
          result[address][trackId] = {
            type: 'Delegating',
            address,
            track: trackId,
            balance: convictionVoting._.balance,
            conviction: convictionVoting._.conviction,
            target: toAddress(convictionVoting._.target),
            prior: convictionVoting._.prior,
          };
          break;
        }
        case 'Casting': {
          const votes: Record<ReferendumId, AccountVote> = {};
          for (const { referendum, vote } of convictionVoting._.votes) {
            const referendumId = referendum.toString();

            switch (vote.type) {
              case 'Standard':
                votes[referendumId] = {
                  type: 'Standard',
                  vote: {
                    aye: vote._.vote.isAye,
                    conviction: vote._.vote.conviction.type,
                  },
                  balance: vote._.balance,
                };
                break;
              case 'Split':
                votes[referendumId] = {
                  type: 'Split',
                  aye: vote._.aye,
                  nay: vote._.nay,
                };
                break;
              case 'SplitAbstain':
                votes[referendumId] = {
                  type: 'SplitAbstain',
                  aye: vote._.aye,
                  nay: vote._.nay,
                  abstain: vote._.abstain,
                };
                break;
            }
          }

          result[address][trackId] = {
            type: 'Casting',
            track: trackId,
            address,
            votes,
            prior: convictionVoting._.prior,
          };
        }
      }
    }

    callback(result);
  });
}

function subscribeReferendums(api: ApiPromise, callback: (referendums: Referendum[]) => unknown) {
  governanceService.getReferendums(api).then(callback);

  return polkadotjsHelpers.subscribeSystemEvents({ api, section: 'referenda' }, () => {
    governanceService.getReferendums(api).then(callback);
  });
}
