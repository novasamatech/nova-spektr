import { combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { voting } from '@/domains/collectives';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';

const $votes = fellowship.$store.map(store => store?.voting ?? []);
const $referendums = fellowship.$store.map(store => store?.referendums ?? []);

const $members = fellowship.$store.map(s => s?.members ?? []);

const $memberVotes = combine(memberProfile.$member, $votes, (member, voting) => {
  if (nullable(member)) return [];
  return voting.filter(v => v.accountId === member.accountId);
});

const votesRequested = attachToFeatureInput(
  fellowshipTasksFeature,
  combine({ referendums: $referendums, members: $members }),
);

sample({
  clock: votesRequested,
  fn({ input, data: { referendums, members } }) {
    return {
      palletType: input.palletType,
      api: input.api,
      chain: input.chain,
      referendums: referendums.map(r => r.id),
      accounts: members.map(m => m.accountId),
    };
  },
  target: voting.request,
});

export const votes = {
  $memberVotes,
};
