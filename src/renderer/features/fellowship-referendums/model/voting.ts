import { createStore, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/effector';
import { toKeysRecord } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { type Voting, collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { referendumsFeatureStatus } from './status';

const $voting = fellowshipModel.$store.map(x => x?.voting ?? []);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);

const $accountsVoting = createStore<Voting[]>([]).reset(referendumsFeatureStatus.stopped);

sample({
  clock: attachToFeatureInput(referendumsFeatureStatus, $referendums),

  fn: ({ input: { palletType, api, chainId, accounts }, data: referendums }) => {
    return {
      palletType,
      api,
      chainId,
      referendums: referendums.map(r => r.id),
      // TODO use branded account id
      accounts: accounts.map(a => pjsSchema.helpers.toAccountId(a.accountId)),
    };
  },

  target: collectiveDomain.voting.subscribe,
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
