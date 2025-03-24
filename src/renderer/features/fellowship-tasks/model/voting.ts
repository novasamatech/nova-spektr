import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { voting } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';

const $votes = fellowship.$store.map(store => store?.voting ?? []);
const $referendums = fellowship.$store.map(store => store?.referendums ?? []);

const $memberVotes = combine(memberProfile.$member, $votes, (member, voting) => {
  if (nullable(member)) return [];
  return voting.filter(v => v.accountId === member.accountId);
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, $referendums),
  filter({ data: referendums }) {
    return referendums.length > 0;
  },
  fn({ input, data }) {
    return {
      palletType: input.palletType,
      chainId: input.chainId,
      referendums: data.map(r => r.id),
    };
  },
  target: voting.request,
});

export const votes = {
  $memberVotes,
};
