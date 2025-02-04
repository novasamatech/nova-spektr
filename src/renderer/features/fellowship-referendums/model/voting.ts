import { restore, sample } from 'effector';
import { debounce } from 'patronum';

import { waitFor } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable } from '@/shared/lib/utils';
import { voting } from '@/domains/collectives';

import { referendumsFeatureStatus } from './feature';
import { fellowshipModel } from './fellowship';

const $voting = fellowshipModel.$store.map(x => x?.voting ?? []);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);

const $currentMember = referendumsFeatureStatus.input.map(store => (store ? store.member : null));

const votesUpdated = waitFor({
  source: $voting,
  clock: $currentMember,
  filter: nonNullable,
  reset: referendumsFeatureStatus.stopped,
}).map(({ event: voting, trigger: member }) => voting.filter(voting => voting.accountId === member.accountId));

const $accountVotes = restore(votesUpdated, []).reset(referendumsFeatureStatus.stopped);

sample({
  clock: referendumsFeatureStatus.running,
  fn({ palletType, api, chainId, account }) {
    return {
      palletType,
      api,
      chainId,
      accounts: account ? [account.accountId] : [],
    };
  },
  target: voting.subscribeAccountsVoting,
});

sample({
  clock: attachToFeatureInput(referendumsFeatureStatus, debounce($referendums, 1000)),
  fn: ({ input: { palletType, api, chainId }, data: referendums }) => {
    return {
      palletType,
      api,
      chainId,
      referendums: referendums.map(r => r.id),
    };
  },
  target: voting.request,
});

export const votingModel = {
  $voting,
  $accountVotes,
};
