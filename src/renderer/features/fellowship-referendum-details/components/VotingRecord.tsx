import { useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { CaptionText, HelpText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
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

  const isActivityFit =
    nullable(activityThreshold) || (nonNullable(activity?.activity) && activity?.activity >= activityThreshold);
  const isAgreementFit =
    nullable(agreementThreshold) || (nonNullable(activity?.agreement) && activity?.agreement >= agreementThreshold);

  return (
    <Box direction="row" width="100%">
      <Box width="100%" grow={1} gap={1.5}>
        <Box direction="row" verticalAlign="start" gap={3}>
          <Icon
            size={32}
            name="checkmarkCutout"
            className={isActivityFit ? 'text-icon-positive' : 'text-icon-default'}
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
                  {nonNullable(activityThreshold) ? Math.min(activity?.activity, activityThreshold).toString() : '100'}
                </SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">
                  {activityThreshold || '100'}%
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
            className={isAgreementFit ? 'text-icon-positive' : 'text-icon-default'}
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
                  {nonNullable(agreementThreshold)
                    ? Math.min(activity?.agreement, agreementThreshold).toString()
                    : '100'}
                </SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">
                  {agreementThreshold || '100'}%
                </CaptionText>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
});
