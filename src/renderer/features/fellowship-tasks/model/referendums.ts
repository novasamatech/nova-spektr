import { attach, combine, createEvent, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { evidence, referendum, referendumMeta, referendumService, track, voting } from '@/domains/collectives';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';

const requestEvidence = createEvent<AccountId>();
const requestEvidenceFx = attach({ effect: evidence.request });
const requestVotesFx = attach({ effect: voting.request });

const $votes = fellowship.$store.map(store => store?.voting ?? []);
const $referendums = fellowship.$store.map(store => store?.referendums ?? []);
const $metadata = fellowship.$store.map(store => store?.referendumMeta ?? {});
const $ongoing = $referendums.map(referendumService.getOngoingReferendums);
const $completed = $referendums.map(referendumService.getCompletedReferendums);

const $memberVotes = combine(memberProfile.$member, $votes, (member, voting) => {
  if (nullable(member)) return [];
  return voting.filter(v => v.accountId === member.accountId);
});

sample({
  clock: fellowshipTasksFeature.running,
  target: [track.request],
});

sample({
  clock: attachToFeatureInput(fellowshipTasksFeature, $ongoing),
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
  target: requestVotesFx,
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
  target: requestEvidenceFx,
});

sample({
  clock: fellowshipTasksFeature.running,
  target: referendum.subscribe,
});

sample({
  clock: fellowshipTasksFeature.stopped,
  target: referendum.unsubscribe,
});

const metadataProviderUpdated = attachToFeatureInput(fellowshipTasksFeature, governanceMetaProvider.$metaProvider);

sample({
  clock: metadataProviderUpdated,
  filter({ data }) {
    return nonNullable(data);
  },
  fn: ({ input: { chainId, palletType }, data: api }) => ({
    provider: api!.type,
    chainId,
    palletType,
  }),
  target: referendumMeta.request,
});

export const referendums = {
  $memberVoting: $memberVotes,
  $ongoing,
  $completed,
  $metadata,
  $evidencePending: requestEvidenceFx.pending,

  pending: referendum.pending,
  requestEvidence,
};
