import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { CaptionText, HelpText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton, Speedometer, Tooltip } from '@/shared/ui-kit';
import { memberService } from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useActivity } from '../hooks/useActivity';

const useVotingRecordData = () => {
  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: activity, pending: pendingActivity } = useActivity();

  const isLoading = pendingMember || pendingActivity;

  return useMemo(() => {
    if (nullable(member) || !memberService.isCoreMember(member)) {
      return { isValid: false } as const;
    }

    if (nullable(activity) || nullable(activity.activity) || nullable(activity.agreement)) {
      return { isValid: false, isLoading } as const;
    }

    const actualActivityThreshold = activity.activityThreshold ?? 100;
    const actualAgreementThreshold = activity.agreementThreshold ?? 100;

    const isActivityFit = activity.activity >= actualActivityThreshold;
    const isAgreementFit = activity.agreement >= actualAgreementThreshold;

    const actualActivity = Math.min(activity.activity, actualActivityThreshold);
    const actualAgreement = Math.min(activity.agreement, actualAgreementThreshold);

    return {
      isValid: true,
      isLoading,
      actualActivity,
      actualAgreement,
      actualActivityThreshold,
      actualAgreementThreshold,
      isActivityFit,
      isAgreementFit,
    } as const;
  }, [member, activity]);
};

export const VotingRecord = memo(() => {
  const { t } = useI18n();
  const data = useVotingRecordData();

  if (data.isLoading) {
    return (
      <div className="flex w-full gap-1.5">
        <Skeleton height="64px" />
        <Skeleton height="64px" />
      </div>
    );
  }

  if (!data.isValid) {
    return null;
  }

  const {
    actualActivity,
    actualAgreement,
    actualActivityThreshold,
    actualAgreementThreshold,
    isActivityFit,
    isAgreementFit,
  } = data;

  return (
    <Box direction="row" width="100%" gap={1.5}>
      <div className="flex-1 rounded-lg bg-card-background px-4 py-3">
        <Box width="100%" grow={1} gap={1.5}>
          <Box direction="row" verticalAlign="start" gap={3}>
            <Speedometer size={40} value={actualActivity} max={100} variant={isActivityFit ? 'green' : 'grey'} />

            <Box gap={1}>
              <HelpText>{t('fellowship.members.activity')}</HelpText>
              <Box direction="row" verticalAlign="end">
                <SmallTitleText>{actualActivity}%</SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">{actualActivityThreshold}%</CaptionText>
              </Box>
            </Box>
            <div className="ml-auto">
              <Tooltip side="bottom" enableHover>
                <Tooltip.Trigger>
                  <div tabIndex={0}>
                    <Icon name="questionOutline" size={16} className="hover:text-icon-hover active:text-icon-active" />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('fellowship.members.activityTooltip')}</Tooltip.Content>
              </Tooltip>
            </div>
          </Box>
        </Box>
      </div>

      <div className="flex-1 rounded-lg bg-card-background px-4 py-3">
        <Box width="100%" grow={1} gap={1.5}>
          <Box direction="row" verticalAlign="start" gap={3}>
            <Speedometer size={40} value={actualAgreement} max={100} variant={isAgreementFit ? 'green' : 'grey'} />

            <Box gap={1}>
              <HelpText>{t('fellowship.members.agreement')}</HelpText>
              <Box direction="row" verticalAlign="end">
                <SmallTitleText>{actualAgreement}%</SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">{actualAgreementThreshold}%</CaptionText>
              </Box>
            </Box>
            <div className="ml-auto">
              <Tooltip side="bottom" enableHover>
                <Tooltip.Trigger>
                  <div tabIndex={0}>
                    <Icon name="questionOutline" size={16} className="hover:text-icon-hover active:text-icon-active" />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('fellowship.members.agreementTooltip')}</Tooltip.Content>
              </Tooltip>
            </div>
          </Box>
        </Box>
      </div>
    </Box>
  );
});

export const VotingRecordWidget = memo(() => {
  const { t } = useI18n();
  const data = useVotingRecordData();

  if (data.isLoading) {
    return <Skeleton height="40px" />;
  }

  if (!data.isValid) {
    return null;
  }

  const { actualActivity, actualAgreement, isActivityFit, isAgreementFit } = data;

  return (
    <Box direction="row" width="100%">
      <Box width="100%" grow={1} gap={1.5}>
        <Box direction="row" verticalAlign="start" gap={3} padding={[0, 3, 0, 0]}>
          <Speedometer size={40} value={actualActivity} max={100} variant={isActivityFit ? 'green' : 'grey'} />

          <Box gap={1}>
            <HelpText>{t('fellowship.members.activity')}</HelpText>
            <SmallTitleText>{actualActivity}%</SmallTitleText>
          </Box>
        </Box>
      </Box>

      <Box width="100%" grow={1} gap={1.5}>
        <Box direction="row" verticalAlign="start" gap={3}>
          <Speedometer size={40} value={actualAgreement} max={100} variant={isAgreementFit ? 'green' : 'grey'} />

          <Box gap={1}>
            <HelpText>{t('fellowship.members.agreement')}</HelpText>
            <SmallTitleText>{actualAgreement}%</SmallTitleText>
          </Box>
        </Box>
      </Box>
    </Box>
  );
});
