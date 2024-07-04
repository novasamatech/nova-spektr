import { createEffect, createEvent, createStore, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { readonly } from 'patronum';

import { walletModel } from '@entities/wallet';
import { Address, TrackId, type VotingMap } from '@shared/core';
import { governanceService } from '@shared/api/governance';
import { walletService } from '../lib/wallet-service';
import { tracksModel } from './tracks-model';

const $voting = createStore<VotingMap>({});

type VotingParams = {
  api: ApiPromise;
  tracksIds: TrackId[];
  addresses: Address[];
};

const requestVoting = createEvent<VotingParams>();

const requestVotingFx = createEffect(({ api, tracksIds, addresses }: VotingParams): Promise<VotingMap> => {
  return governanceService.getVotingFor(api, tracksIds, addresses);
});

sample({
  clock: tracksModel.events.requestDone,
  source: {
    wallet: walletModel.$activeWallet,
  },
  fn: ({ wallet }, { params, result }) => {
    return {
      api: params.api,
      tracksIds: Object.keys(result),
      addresses: walletService.getAddressesForWallet(wallet!, params.chain),
    };
  },
  target: requestVotingFx,
});

sample({
  clock: requestVotingFx.doneData,
  source: $voting,
  fn: (voting, newVoting) => ({ ...voting, ...newVoting }),
  target: $voting,
});

export const votingModel = {
  $voting: readonly($voting),

  effects: {
    requestVotingFx,
  },

  events: {
    requestVoting,
  },
};
