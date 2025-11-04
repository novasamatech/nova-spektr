import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { CaptionText, HelpText, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton, Speedometer } from '@/shared/ui-kit';
import { type Evidence, type Referendum } from '@/domains/collectives';
import { useActivity } from '../hooks/useActivity';
import { useProposer } from '../hooks/useProposer';

type Props = {
  referendum: Referendum | null;
  evidence: Evidence | null;
};

export const VotingRecord = memo(({ referendum, evidence }: Props) => {
  const { t } = useI18n();

  const proposer = useProposer(referendum);
  const memberId = proposer || evidence?.accountId || null;

  const { data: activity } = useActivity(memberId);

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
