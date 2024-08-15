import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';

import {
  type AccountVote,
  type Address,
  type ReferendumId,
  type TrackId,
  type Voting,
  type VotingMap,
} from '@/shared/core';

export const governanceSubscribeService = {
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
): () => void {
  const tuples = addresses.flatMap((address) => tracksIds.map((trackId) => [address, trackId]));

  const unsubscribe = api.query.convictionVoting.votingFor.multi(tuples, (votings) => {
    const result = addresses.reduce<Record<Address, Record<TrackId, Voting>>>((acc, address) => {
      acc[address] = {};

      return acc;
    }, {});

    for (const [index, convictionVoting] of votings.entries()) {
      if (convictionVoting.isStorageFallback) continue;

      const address = tuples[index]?.[0];
      const trackId = tuples[index]?.[1];
      if (!address || !trackId) {
        continue;
      }

      if (convictionVoting.isDelegating) {
        const delegation = convictionVoting.asDelegating;

        result[address][trackId] = {
          type: 'Delegating',
          address,
          track: trackId,
          balance: delegation.balance.toBn(),
          conviction: delegation.conviction.type,
          target: delegation.target.toString(),
          prior: {
            unlockAt: delegation.prior[0].toNumber(),
            amount: delegation.prior[1].toBn(),
          },
        };
      }

      if (convictionVoting.isCasting) {
        const votes: Record<ReferendumId, AccountVote> = {};
        for (const [referendumIndex, vote] of convictionVoting.asCasting.votes) {
          const referendumId = referendumIndex.toString();

          if (vote.isStandard) {
            const standardVote = vote.asStandard;
            votes[referendumId] = {
              type: 'Standard',
              vote: {
                aye: standardVote.vote.isAye,
                conviction: standardVote.vote.conviction.type,
              },
              balance: standardVote.balance.toBn(),
            };
          }

          if (vote.isSplit) {
            const splitVote = vote.asSplit;
            votes[referendumId] = {
              type: 'Split',
              aye: splitVote.aye.toBn(),
              nay: splitVote.nay.toBn(),
            };
          }

          if (vote.isSplitAbstain) {
            const splitAbstainVote = vote.asSplitAbstain;
            votes[referendumId] = {
              type: 'SplitAbstain',
              aye: splitAbstainVote.aye.toBn(),
              nay: splitAbstainVote.nay.toBn(),
              abstain: splitAbstainVote.abstain.toBn(),
            };
          }
        }

        result[address][trackId] = {
          type: 'Casting',
          track: trackId,
          address,
          votes,
          prior: {
            unlockAt: convictionVoting.asCasting.prior[0].toNumber(),
            amount: convictionVoting.asCasting.prior[1].toBn(),
          },
        };
      }
    }

    callback(result);
  });

  return () => {
    unsubscribe.then((fn) => fn());
  };
}
