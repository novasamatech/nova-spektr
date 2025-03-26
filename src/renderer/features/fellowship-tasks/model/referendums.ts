import { format } from 'date-fns/format';
import { attach, combine, sample } from 'effector';

import { attachToFeatureInput } from '@/shared/feature';
import { getCreatedDateFromApi, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { evidence, memberService, referendum, referendumMeta, referendumService, track } from '@/domains/collectives';
import { identity } from '@/domains/network';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';

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

    let evidencePeriodStart: string | null = null;
    if (member && memberService.isCoreMember(member)) {
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

      githubHandle: accountIdentity?.github,
      evidencePeriodStart,
    });
  },
});

const $referendums = fellowship.$store.map(store => store?.referendums ?? []);
const $metadata = fellowship.$store.map(store => store?.referendumMeta ?? {});
const $ongoing = $referendums.map(referendumService.getOngoingReferendums);
const $completed = $referendums.map(referendumService.getCompletedReferendums);

sample({
  clock: fellowshipTasksFeature.running,
  target: [track.request],
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
  fn: ({ input: { chainId, palletType, api }, data: apiSource }) => ({
    provider: apiSource!.type,
    api,
    chainId,
    palletType,
  }),
  target: referendumMeta.request,
});

export const referendums = {
  $ongoing,
  $completed,
  $metadata,
  $evidencePending: requestEvidenceSummaryFx.pending,

  pending: referendum.pending,
  requestEvidenceSummaryFx,
};
