import { createStore, sample } from 'effector';

import { connectToFeatureInput } from '@/shared/effector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { toKeysRecord } from '@shared/lib/utils';
import { type Voting, collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { referendumsFeatureStatus } from './status';

const $voting = fellowshipModel.$store.map(x => x?.voting ?? []);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $walletVoting = createStore<Voting[]>([]);

const referendumUpdates = connectToFeatureInput(referendumsFeatureStatus, $referendums);
const votingUpdates = connectToFeatureInput(referendumsFeatureStatus, $voting);

sample({
  clock: referendumUpdates,
  fn: ({ input: { palletType, api, chainId, wallet }, store: referendums }) => {
    return {
      palletType,
      api,
      chainId,
      referendums: referendums.map(r => r.id),
      // TODO use branded account id
      accounts: wallet.accounts.map(a => a.accountId as AccountId),
    };
  },
  target: collectiveDomain.voting.subscribe,
});

sample({
  clock: votingUpdates,
  fn: ({ input: { wallet }, store: voting }) => {
    const accounts = toKeysRecord(wallet.accounts.map(a => a.accountId));

    return voting.filter(voting => voting.accountId in accounts);
  },
  target: $walletVoting,
});

export const votingModel = {
  $voting,
  $walletVoting,
};
