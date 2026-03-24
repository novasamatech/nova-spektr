import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  memberService,
  referendumMetaService,
  useAllVotes,
  useMaxRank,
  useMember,
  useReferendumMeta,
} from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

export const useActivity = (accountId: AccountId | null) => {
  const provider = useUnit(governanceMetaProvider.$metaProvider);
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: member, pending: memberPending } = useMember({ palletType: 'fellowship', api, accountId });
  const { data: maxRank, pending: maxRankPending } = useMaxRank({ palletType: 'fellowship', api });
  const { data: meta, pending: metaPending } = useReferendumMeta({
    palletType: 'fellowship',
    api,
    chain,
    provider: provider?.type ?? null,
  });
  const { data: votes, pending: votesPending } = useAllVotes({ palletType: 'fellowship', api, chain });

  const metaArray = useMemo(() => Object.values(meta), [meta]);

  let data = null;

  if (nonNullable(maxRank) && nonNullable(member) && memberService.isCoreMember(member)) {
    const referendums = referendumMetaService.getReferendumsSinceLastProof(metaArray, member);
    const values = referendumMetaService.getActivityInfo(referendums, member, maxRank, votes);
    const thresholds = memberService.getActivityAndAgreementThresholds(member.rank);

    const isActivityFit =
      nullable(thresholds.activity) || (nonNullable(values?.activity) && values?.activity >= thresholds.activity);
    const isAgreementFit =
      nullable(thresholds.agreement) || (nonNullable(values?.agreement) && values?.agreement >= thresholds.agreement);

    data = {
      activity: values?.activity ?? null,
      agreement: values?.agreement ?? null,
      activityThreshold: thresholds.activity,
      agreementThreshold: thresholds.agreement,
      isActivityFit,
      isAgreementFit,
    };
  }

  return { data, pending: memberPending || maxRankPending || metaPending || votesPending };
};
