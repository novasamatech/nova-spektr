import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { CaptionText, HelpText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
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

  if (nullable(activity)) return null;

  return (
    <Box direction="row" width="100%">
      <Box width="100%" grow={1} gap={1.5}>
        <Box direction="row" verticalAlign="start" gap={3}>
          <Icon
            size={32}
            name="checkmarkCutout"
            className={activity.isActivityFit ? 'text-icon-positive' : 'text-icon-default'}
          />
          <Box>
            <HelpText>{t('fellowship.members.activity')}</HelpText>
            {nullable(activity) ? (
              <Skeleton height={5} />
            ) : nullable(activity.activity) ? (
              <SmallTitleText>{t('fellowship.n/a')}</SmallTitleText>
            ) : (
              <Box direction="row" verticalAlign="end">
                <SmallTitleText>
                  {nonNullable(activity.activityThreshold)
                    ? Math.min(activity?.activity, activity.activityThreshold).toString()
                    : '100'}
                </SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">
                  {activity.activityThreshold || '100'}%
                </CaptionText>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box width="100%" grow={1} gap={1.5}>
        <Box direction="row" verticalAlign="start" gap={3}>
          <Icon
            size={32}
            name="checkmarkCutout"
            className={activity.isAgreementFit ? 'text-icon-positive' : 'text-icon-default'}
          />
          <Box>
            <HelpText>{t('fellowship.members.agreement')}</HelpText>
            {nullable(activity) ? (
              <Skeleton height={5} />
            ) : nullable(activity.agreement) ? (
              <SmallTitleText>{t('fellowship.n/a')}</SmallTitleText>
            ) : (
              <Box direction="row" verticalAlign="end">
                <SmallTitleText>
                  {nonNullable(activity.agreementThreshold)
                    ? Math.min(activity?.agreement, activity.agreementThreshold).toString()
                    : '100'}
                </SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">
                  {activity.agreementThreshold || '100'}%
                </CaptionText>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
});
