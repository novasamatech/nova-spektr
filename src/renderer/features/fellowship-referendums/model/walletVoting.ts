import { sample } from 'effector';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { collectiveDomain } from '@/domains/collectives';

import { referendumListModel } from './list';
import { referendumsFeatureStatus } from './status';

// TODO listen to referendums
sample({
  clock: referendumsFeatureStatus.running,
  source: referendumListModel.$referendums,
  fn: (referendums, { palletType, api, chainId, wallet }) => {
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

export const walletVotingModel = {};
