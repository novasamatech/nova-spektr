import { useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { CaptionText, HelpText, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { Speedometer } from '@/shared/ui-kit/Speedometer/Speedomenter';
import { type Evidence, memberService, referendumMetaService } from '@/domains/collectives';
import { details } from '../model/details';
import { fellowship } from '../model/fellowship';

type Props = {
  evidence?: Evidence;
};

export const VotingRecord = memo(({ evidence }: Props) => {
  const { t } = useI18n();

  const proposer = useUnit(details.$proposer);
  const member = useStoreMap({
    store: details.$members,
    keys: [proposer || evidence?.accountId],
    fn: (members, [accountId]) => (accountId && members[accountId]) ?? null,
  });

  const { meta, votes, maxRank } = useStoreMap({
    store: fellowship.$store,
    keys: [],
    fn: store => ({
      meta: store?.referendumMeta ? Object.values(store.referendumMeta) : null,
      votes: store?.voting ?? null,
      maxRank: store?.maxRank ?? 0,
    }),
  });

  if (nullable(member) || !memberService.isCoreMember(member)) return null;

  const referendums = meta ? referendumMetaService.getReferendumsSinceLastProof(meta, member) : null;

  const activity = referendumMetaService.getActivityInfo(referendums, member, maxRank, votes);

  const { activity: activityThreshold, agreement: agreementThreshold } =
    memberService.getActivityAndAgreementThresholds(member.rank);

  if (nullable(activity) || nullable(activity.activity) || nullable(activity.agreement)) {
    return <Skeleton height={5} />;
  }

  const actualActivityThreshold = activityThreshold ?? 100;
  const actualAgreementThreshold = agreementThreshold ?? 100;

  const isActivityFit = activity.activity >= actualActivityThreshold;
  const isAgreementFit = activity.agreement >= actualAgreementThreshold;

  const actualActivity = Math.min(activity.activity, actualActivityThreshold);
  const actualAgreement = Math.min(activity.agreement, actualAgreementThreshold);

  return (
    <Box direction="row" width="100%">
      <Box width="100%" grow={1} gap={1.5}>
        <Box direction="row" verticalAlign="start" gap={3}>
          <Speedometer size={40} value={actualActivity} max={100} variant={isActivityFit ? 'green' : 'grey'} />

          <Box>
            <HelpText>{t('fellowship.members.activity')}</HelpText>
            <Box direction="row" verticalAlign="end">
              <SmallTitleText>{actualActivity}%</SmallTitleText>
              <CaptionText className="ml-1 text-[10px] text-text-secondary">{actualActivityThreshold}%</CaptionText>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box width="100%" grow={1} gap={1.5}>
        <Box direction="row" verticalAlign="start" gap={3}>
          <Speedometer size={40} value={actualAgreement} max={100} variant={isAgreementFit ? 'green' : 'grey'} />

          <Box>
            <HelpText>{t('fellowship.members.agreement')}</HelpText>
            <Box direction="row" verticalAlign="end">
              <SmallTitleText>{actualAgreement}%</SmallTitleText>
              <CaptionText className="ml-1 text-[10px] text-text-secondary">{actualAgreementThreshold}%</CaptionText>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
});
