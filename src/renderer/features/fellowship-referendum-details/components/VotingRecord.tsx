import { useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { CaptionText, HelpText, Icon, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type Evidence, memberService, referendumMetaService } from '@/domains/collectives';
import { details } from '../model/details';
import { fellowship } from '../model/fellowship';
import { detailsService } from '../service';

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
      meta: Object.values(store?.referendumMeta ?? {}),
      votes: store?.voting ?? [],
      maxRank: store?.maxRank ?? 0,
    }),
  });

  if (nullable(member) || !memberService.isCoreMember(member)) return null;

  const referendums = referendumMetaService.getReferendumsSinceLastProof(meta, member);

  const activity = referendumMetaService.getActivityInfo(referendums, member, maxRank, votes);

  const { activity: activityThreshold, agreement: agreementThreshold } =
    detailsService.getActivityAndAgreementThresholds(member.rank);

  const isActivityFit =
    nonNullable(activity.activity) && nonNullable(activityThreshold) ? activity.activity >= activityThreshold : false;
  const isAgreementFit =
    nonNullable(activity.agreement) && nonNullable(agreementThreshold)
      ? activity.agreement >= agreementThreshold
      : false;

  return (
    <Box direction="row" width="100%">
      <Box width="100%" grow={1} gap={1.5}>
        {nonNullable(activity.activity) && nonNullable(activityThreshold) ? (
          <Box direction="row" verticalAlign="start" gap={3}>
            <Icon
              size={32}
              name="checkmarkCutout"
              className={isActivityFit ? 'text-icon-positive' : 'text-icon-default'}
            />
            <Box>
              <HelpText>{t('fellowship.members.activity')}</HelpText>
              <Box direction="row" verticalAlign="end">
                <SmallTitleText>{activity.activity.toString()}</SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">{activityThreshold}%</CaptionText>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box gap={1}>
            <HelpText>{t('fellowship.members.activity')}</HelpText>
            <SmallTitleText>{t('fellowship.n/a')}</SmallTitleText>
          </Box>
        )}
      </Box>

      <Box width="100%" grow={1} gap={1.5}>
        {nonNullable(activity.agreement) && nonNullable(agreementThreshold) ? (
          <Box direction="row" verticalAlign="start" gap={3}>
            <Icon
              size={32}
              name="checkmarkCutout"
              className={isAgreementFit ? 'text-icon-positive' : 'text-icon-default'}
            />
            <Box>
              <HelpText>{t('fellowship.members.agreement')}</HelpText>
              <Box direction="row" verticalAlign="end">
                <SmallTitleText>{activity.agreement.toString()}</SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">{agreementThreshold}%</CaptionText>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box gap={1}>
            <HelpText>{t('fellowship.members.agreement')}</HelpText>
            <SmallTitleText>{t('fellowship.n/a')}</SmallTitleText>
          </Box>
        )}
      </Box>
    </Box>
  );
});
