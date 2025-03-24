import { format } from 'date-fns/format';
import { attach, combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { getCreatedDateFromApi, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  evidence,
  memberService,
  referendum,
  referendumMeta,
  referendumService,
  track,
  voting,
} from '@/domains/collectives';
import { identity } from '@/domains/network';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';

const requestEvidenceSummaryFx = attach({
  source: combine({
    input: fellowshipTasksFeature.input,
    members: fellowship.$store.map(state => state?.members || []),
  }),
  effect: async ({ input, members }, { accountId, isPromotion }: { accountId: AccountId; isPromotion: boolean }) => {
    if (!input) return;

    const identityMap = await identity.request({
      chainId: input.chainId,
      accounts: [accountId],
    });

    const accountIdentity = identityMap[accountId];
    const member = members.find(m => m.accountId === accountId);

    if (!accountIdentity || !member) return;

    let evidencePeriodStart: string | null = null;
    console.log({ member, isCoreMember: memberService.isCoreMember(member) });
    if (memberService.isCoreMember(member)) {
      // const currentBlock = await getCurrentBlockNumber(input.api);
      const periodStart = isPromotion
        ? await getCreatedDateFromApi(member.lastPromotion || member.lastProof, input.api)
        : await getCreatedDateFromApi(member.lastProof, input.api);
      evidencePeriodStart = format(periodStart, 'dd/MM/yyyy');
    }

    return evidence.request({
      palletType: input.palletType,
      api: input.api,
      chain: input.chain,
      accountId: accountId,

      githubHandle: accountIdentity.github,
      evidencePeriodStart,
    });
  },
});
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
  $evidencePending: requestEvidenceSummaryFx.pending,

  pending: referendum.pending,
  requestEvidenceSummaryFx,
};
