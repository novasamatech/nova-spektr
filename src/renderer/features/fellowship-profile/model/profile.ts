import { combine, sample } from 'effector';
import { or } from 'patronum';

import { nullable } from '@shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';
import { walletModel } from '@entities/wallet';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

import { fellowshipModel } from './fellowship';
import { profileFeatureStatus } from './status';

const $members = fellowshipModel.$store.map(x => x?.members ?? []);
const $account = combine(
  {
    wallet: walletModel.$activeWallet,
    members: $members,
    network: fellowshipNetworkFeature.model.network.$network,
  },
  ({ wallet, members, network }) => {
    if (nullable(wallet) || nullable(members) || nullable(network)) return null;

    return collectiveDomain.members.service.findMachingAccount(wallet, members, network.chain);
  },
);

sample({
  clock: profileFeatureStatus.running,
  target: collectiveDomain.members.subscribe,
});

sample({
  clock: profileFeatureStatus.stopped,
  target: collectiveDomain.members.unsubscribe,
});

export const profileModel = {
  $account,
  $pending: or(collectiveDomain.members.pending, fellowshipNetworkFeature.model.network.$isConnecting),
  $fulfilled: $members.map(x => x.length > 0),
};
