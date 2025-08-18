import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';

import {
  type AccountVote,
  type HexString,
  type Referendum,
  type ReferendumId,
  type TrackId,
  type TrackLocks,
  TransactionType,
  type VotingMap,
} from '@/shared/core';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { referendaPallet } from '@/shared/pallet/referenda';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { governanceService } from './governanceService';

export const governanceSubscribeService = {
  subscribeReferendums,
  subscribeTrackLocks,
  subscribeVotingFor,
};

export type PreimageMap = Map<string, HexString>;

function subscribeTrackLocks(api: ApiPromise, accounts: AccountId[], callback: (res?: TrackLocks) => void): () => void {
  const unsubscribe = api.query.convictionVoting.classLocksFor.multi(accounts, (tuples) => {
    const result: TrackLocks = {};

    for (const [index, locks] of tuples.entries()) {
      const lockData = locks.reduce<Record<TrackId, BN>>((acc, lock) => {
        acc[lock[0].toString()] = lock[1].toBn();

        return acc;
      }, {});

      result[accounts[index]] = lockData;
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
  accounts: AccountId[],
  callback: (voting: VotingMap) => void,
) {
  const tuples = accounts.flatMap((accounts) => tracksIds.map((trackId) => [accounts, trackId] as const));

  return convictionVotingPallet.storage.subscribeVotingFor(api, tuples, (votings) => {
    const result = accounts.reduce<VotingMap>((acc, accountId) => {
      acc[accountId] = {};

      return acc;
    }, {});

    for (const [index, convictionVoting] of votings.entries()) {
      const accountId = tuples[index]?.[0];
      const trackId = tuples[index]?.[1];
      if (!accountId || !trackId) {
        continue;
      }

      switch (convictionVoting.type) {
        case 'Delegating': {
          result[accountId][trackId] = {
            type: 'Delegating',
            accountId,
            track: trackId,
            balance: convictionVoting.data.balance,
            conviction: convictionVoting.data.conviction,
            target: convictionVoting.data.target,
            prior: convictionVoting.data.prior,
          };
          break;
        }
        case 'Casting': {
          const votes: Record<ReferendumId, AccountVote> = {};
          for (const { referendum, vote } of convictionVoting.data.votes) {
            const referendumId = referendum.toString();

            switch (vote.type) {
              case 'Standard':
                votes[referendumId] = {
                  type: 'Standard',
                  vote: {
                    aye: vote.data.vote.isAye,
                    conviction: vote.data.vote.conviction.type,
                  },
                  balance: vote.data.balance,
                };
                break;
              case 'Split':
                votes[referendumId] = {
                  type: 'Split',
                  aye: vote.data.aye,
                  nay: vote.data.nay,
                };
                break;
              case 'SplitAbstain':
                votes[referendumId] = {
                  type: 'SplitAbstain',
                  aye: vote.data.aye,
                  nay: vote.data.nay,
                  abstain: vote.data.abstain,
                };
                break;
            }
          }

          result[accountId][trackId] = {
            type: 'Casting',
            track: trackId,
            accountId,
            votes,
            prior: convictionVoting.data.prior,
          };
        }
      }
    }

    callback(result);
  });
}

function subscribeReferendums(api: ApiPromise, callback: (referendums: IteratorResult<Referendum[], void>) => unknown) {
  let currentAbortController = new AbortController();

  const fetchPages = async (abort: AbortController) => {
    await api.isReady;
    for await (const page of referendaPallet.storage.referendumInfoForPaged('governance', api, 500)) {
      if (abort.signal.aborted) {
        break;
      }

      const proposalsToFetch = governanceService.getLookupProposalsFromPage(page);
      const preimageMap = await governanceService.createPreimageMap(api, proposalsToFetch);

      const value: Referendum[] = [];
      for (const { id, info } of page) {
        if (!info) continue;
        value.push(await governanceService.mapReferendum(id.toString(), info, api, preimageMap));
      }
      callback({ done: false, value });
    }

    callback({ done: true, value: undefined });
  };

  fetchPages(currentAbortController);

  const fn = () => {
    currentAbortController.abort();
    currentAbortController = new AbortController();
    fetchPages(currentAbortController);
  };

  const unsubscribeSystemReferenda = polkadotjsHelpers.subscribeSystemEvents({ api, section: 'referenda' }, fn);
  const unsubscribeSystemConvictionVoting = polkadotjsHelpers.subscribeSystemEvents(
    { api, section: 'convictionVoting' },
    fn,
  );

  const unsubscribeExtrinsics = polkadotjsHelpers.subscribeExtrinsics(
    { api, name: [TransactionType.VOTE, TransactionType.REMOVE_VOTE] },
    fn,
  );

  return Promise.all([unsubscribeSystemReferenda, unsubscribeSystemConvictionVoting, unsubscribeExtrinsics]).then(
    (fns) => () => {
      currentAbortController.abort();
      for (const fn of fns) {
        fn();
      }
    },
  );
}
