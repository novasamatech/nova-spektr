import { combine, createEvent, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { dictionary, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { evidence, referendumService } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowshipModel } from './fellowship';
import { member } from './member';

const requestEvidence = createEvent<AccountId>();

const $voting = fellowshipModel.$store.map(store => store?.voting ?? []);
const $tracks = fellowshipModel.$store.map(store => store?.tracks ?? []);
const $evidences = fellowshipModel.$store.map(store => store?.evidence ?? []);
const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $ongoing = $referendums.map(referendumService.getOngoingReferendums);

const $memberVoting = combine(member.$member, $voting, (member, voting) => {
  if (nullable(member)) return [];
  return voting.filter(v => v.accountId === member.accountId);
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, requestEvidence),
  fn({ input, data: accountId }) {
    return {
      palletType: input.palletType,
      api: input.api,
      chain: input.chain,
      accountId,
    };
  },
  target: evidence.request,
});

const $notVotedReferendumns = combine($ongoing, $memberVoting, (ongoing, voting) => {
  const votingMap = dictionary(voting, 'referendumId');
  return ongoing.filter(referendum => !(referendum.id in votingMap));
});

export const referendumList = {
  $referendums,
  $tracks,
  $evidences,
  $ongoing,
  $memberVoting,
  $notVotedReferendumns,

  requestEvidence,
};
