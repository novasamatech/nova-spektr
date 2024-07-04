import { BN } from '@polkadot/util';
import orderBy from 'lodash/orderBy';
import { createEffect, createEvent, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

import {
  ReferendumId,
  TrackId,
  Tally,
  Voting,
  VotingType,
  CastingVoting,
  type Address,
  Referendum,
  type Wallet,
  Chain,
} from '@shared/core';
import { accountUtils, walletUtils } from '@entities/wallet';
import { toAddress } from '@shared/lib/utils';

export const referendumListUtils = {
  getSortedReferendums,
  getVoteFractions,
  getVotedCount,
  isReferendumVoted,
  getAddressesForWallet,
};

// TODO: use block number to make an appropriate sorting
function getSortedReferendums(referendums: Referendum[]) {
  return orderBy(referendums, ({ referendumId }) => parseInt(referendumId), 'desc');
}

function getVoteFractions(tally: Tally, approve: BN): Record<'aye' | 'nay' | 'pass', number> {
  const total = tally.ayes.add(tally.nays);

  const aye = tally.ayes.muln(10_000_000).div(total).toNumber() / 100_000;
  const nay = tally.nays.muln(10_000_000).div(total).toNumber() / 100_000;
  const pass = parseInt(approve.toString().slice(0, 8)) / 1000000;

  return { aye, nay, pass };
}

// ???
function getVotedCount(tally: Tally, threshold: BN) {
  const total = tally.ayes.add(tally.nays);

  return {
    voted: total,
    of: threshold,
  };
}

function isReferendumVoted(index: ReferendumId, votings: Record<Address, Record<TrackId, Voting>>): boolean {
  for (const votingMap of Object.values(votings)) {
    for (const voting of Object.values(votingMap)) {
      if (voting.type === VotingType.CASTING && (voting as CastingVoting).casting.votes[index]) {
        return true;
      }
    }
  }

  return false;
}

function getAddressesForWallet(wallet: Wallet, chain: Chain) {
  const matchedAccounts = walletUtils.getAccountsBy([wallet], (account) => {
    return accountUtils.isChainIdMatch(account, chain!.chainId);
  });

  return matchedAccounts.map((a) => toAddress(a.accountId, { prefix: chain!.addressPrefix }));
}

export const createChunksEffect = <T, V>(fn: (params: T, callback: (value: V) => unknown) => unknown) => {
  const request = createEvent<T>();
  const receive = createEvent<V>();

  const requestFx = createEffect((params: T) => {
    const boundedReceive = scopeBind(receive, { safe: true });

    return fn(params, boundedReceive);
  });

  sample({
    source: request,
    target: requestFx,
  });

  return {
    request,
    pending: requestFx.pending,
    done: requestFx.done,
    receive: readonly(receive),
  };
};
