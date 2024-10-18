import { createStore, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/effector';
import { toKeysRecord } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { type Voting, collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { referendumsFeatureStatus } from './status';

const $voting = fellowshipModel.$store.map(x => x?.voting ?? []);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);

const $walletVoting = createStore<Voting[]>([]).reset(referendumsFeatureStatus.stopped);

sample({
  clock: attachToFeatureInput(referendumsFeatureStatus, $referendums),

  fn: ({ input: { palletType, api, chainId, wallet }, data: referendums }) => {
    return {
      palletType,
      api,
      chainId,
      referendums: referendums.map(r => r.id),
      // TODO use branded account id
      accounts: wallet.accounts.map(a => pjsSchema.helpers.toAccountId(a.accountId)),
    };
  },

  target: collectiveDomain.voting.subscribe,
});

sample({
  clock: attachToFeatureInput(referendumsFeatureStatus, $voting),

  fn: ({ input: { wallet }, data: voting }) => {
    const accounts = toKeysRecord(wallet.accounts.map(a => a.accountId));

    return voting.filter(voting => voting.accountId in accounts);
  },

  target: $walletVoting,
});

export const votingModel = {
  $voting,
  $walletVoting,
};
