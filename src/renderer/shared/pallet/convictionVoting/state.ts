import { type ApiPromise } from '@polkadot/api';
import { z } from 'zod';

import { type Address, type TrackId } from '@/shared/core';

import { type ConvictionVotingVoteVoting, convictionVotingClassLock, convictionVotingVoteVoting } from './schema';

const getQuery = (api: ApiPromise, name: string) => {
  const convictionVoting = api.query['convictionVoting'];
  if (!convictionVoting) {
    throw new TypeError(`convictionVoting pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = convictionVoting[name];

  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const state = {
  /**
   * The voting classes which have a non-zero lock requirement and the lock
   * amounts which they require. The actual amount locked on behalf of this
   * pallet should always be the maximum of this list.
   */
  classLocksFor(api: ApiPromise, addresses: Address[]) {
    const schema = z.array(z.array(convictionVotingClassLock));
    const classLocksFor = getQuery(api, 'classLocksFor');

    return classLocksFor(addresses).then(schema.parse);
  },

  /**
   * All voting for a particular voter in a particular voting class. We store
   * the balance for the number of votes that we have recorded.
   */
  votingFor(api: ApiPromise, keys: [address: Address, trackId: TrackId][]) {
    const schema = z.array(convictionVotingVoteVoting);
    const votingFor = getQuery(api, 'votingFor');

    return votingFor.multi(keys).then(schema.parse);
  },

  /**
   * All voting for a particular voter in a particular voting class. We store
   * the balance for the number of votes that we have recorded.
   */
  subscribeVotingFor(
    api: ApiPromise,
    keys: (readonly [address: Address, trackId: TrackId])[],
    callback: (value: ConvictionVotingVoteVoting[]) => unknown,
  ) {
    const schema = z.array(convictionVotingVoteVoting);
    const votingFor = getQuery(api, 'votingFor');

    return votingFor.multi(keys, (votings) => {
      callback(schema.parse(votings));
    });
  },
};
