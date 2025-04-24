import { useStoreMap } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { CaptionText, HelpText, Icon, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type Evidence, memberService, referendumMetaService } from '@/domains/collectives';
import { fellowship } from '../../model/fellowship';
import { members } from '../../model/members';

type Props = {
  evidence: Evidence;
};

interface RankMetric {
  activity: number | null;
  agreement: number | null;
}

const rankMetrics: Record<number, RankMetric> = {
  0: { activity: null, agreement: null },
  1: { activity: 90, agreement: null },
  2: { activity: 80, agreement: null },
  3: { activity: 70, agreement: 100 },
  4: { activity: 60, agreement: 90 },
  5: { activity: 50, agreement: 80 },
  6: { activity: 40, agreement: 70 },
  7: { activity: null, agreement: null },
  8: { activity: null, agreement: null },
  9: { activity: null, agreement: null },
};

function getActivityAndAgreement(rank: number) {
  return rankMetrics[rank] ?? { activity: null, agreement: null };
}

export const VotingRecord = memo(({ evidence }: Props) => {
  const { t } = useI18n();

  const member = useStoreMap({
    store: members.$list,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => list.find(m => m.accountId === accountId) ?? null,
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

  const referendums = useMemo(() => {
    return referendumMetaService.getReferendumsSinceLastProof(meta, member, maxRank);
  }, [meta, member, maxRank]);
  const activity = useMemo(() => {
    return referendumMetaService.getActivityInfo(referendums, votes);
  }, [referendums, votes]);

  const { activity: activityMetric, agreement: agreementMetric } = getActivityAndAgreement(member.rank);

  const isActivityFit = nonNullable(activity.activity) && activity.activity >= (activityMetric ?? 0);
  const isAgreementFit = nonNullable(activity.agreement) && activity.agreement >= (agreementMetric ?? 0);

  return (
    <Box direction="row" width="100%">
      <Box width="100%" grow={1} gap={1.5}>
        {nonNullable(activity.activity) && nonNullable(activityMetric) ? (
          <Box direction="row" verticalAlign="start" gap={2}>
            <Icon
              size={32}
              name="checkmarkCutout"
              className={isActivityFit ? 'text-icon-positive' : 'text-icon-default'}
            />
            <Box>
              <HelpText>{t('fellowship.members.activity')}</HelpText>
              <Box direction="row" verticalAlign="end">
                <SmallTitleText>{activity.activity}</SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">{activityMetric}%</CaptionText>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box gap={2}>
            <HelpText>{t('fellowship.members.activity')}</HelpText>
            <SmallTitleText>{t('fellowship.n/a')}</SmallTitleText>
          </Box>
        )}
      </Box>

      <Box width="100%" grow={1} gap={1.5}>
        {nonNullable(activity.agreement) && nonNullable(agreementMetric) ? (
          <Box direction="row" verticalAlign="start" gap={2}>
            <Icon
              size={32}
              name="checkmarkCutout"
              className={isAgreementFit ? 'text-icon-positive' : 'text-icon-default'}
            />
            <Box>
              <HelpText>{t('fellowship.members.agreement')}</HelpText>
              <Box direction="row" verticalAlign="end">
                <SmallTitleText>{activity.agreement}</SmallTitleText>
                <CaptionText className="ml-1 text-[10px] text-text-secondary">{agreementMetric}%</CaptionText>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box gap={2}>
            <HelpText>{t('fellowship.members.agreement')}</HelpText>
            <SmallTitleText>{t('fellowship.n/a')}</SmallTitleText>
          </Box>
        )}
      </Box>
    </Box>
  );
});
