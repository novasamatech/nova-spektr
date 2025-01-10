import { createStore, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { toKeysRecord } from '@/shared/lib/utils';
import { type Vote, collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { referendumsFeatureStatus } from './status';

const $voting = fellowshipModel.$store.map(x => x?.voting ?? []);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);

const $accountsVoting = createStore<Vote[]>([]).reset(referendumsFeatureStatus.stopped);

sample({
  clock: attachToFeatureInput(referendumsFeatureStatus, $referendums),

  fn: ({ input: { palletType, api, chainId, accounts }, data: referendums }) => {
    return {
      palletType,
      api,
      chainId,
      referendums: referendums.map(r => r.id),
      accounts: accounts.map(a => a.accountId),
    };
  },

  target: collectiveDomain.voting.subscribeAccountsVoting,
});

sample({
  clock: attachToFeatureInput(referendumsFeatureStatus, $voting),

  fn: ({ input: { accounts }, data: voting }) => {
    const accountsMap = toKeysRecord(accounts.map(a => a.accountId));

    return voting.filter(voting => voting.accountId in accountsMap);
  },

  target: $accountsVoting,
});

export const votingModel = {
  $voting,
  $accountsVoting,
};
