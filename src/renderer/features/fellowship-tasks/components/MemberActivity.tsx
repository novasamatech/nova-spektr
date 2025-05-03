import { useStoreMap } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, Icon } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { memberService, referendumMetaService } from '@/domains/collectives';
import { fellowship } from '../model/fellowship';
import { members } from '../model/members';
import { tasksService } from '../service';

type Props = {
  accountId: AccountId;
};

export const MemberActivity = memo(({ accountId }: Props) => {
  const { t } = useI18n();

  const member = useStoreMap({
    store: members.$list,
    keys: [accountId],
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

  const notMemberOrNotCoreMember = nullable(member) || !memberService.isCoreMember(member);

  const referendums = useMemo(() => {
    if (notMemberOrNotCoreMember) return [];

    return referendumMetaService.getReferendumsSinceLastProof(meta, member);
  }, [meta, member, notMemberOrNotCoreMember]);
  const activity = useMemo(() => {
    if (notMemberOrNotCoreMember) return { activity: null, agreement: null };

    return referendumMetaService.getActivityInfo(referendums, member, maxRank, votes);
  }, [referendums, member, maxRank, votes, notMemberOrNotCoreMember]);

  if (notMemberOrNotCoreMember) return null;

  const { activity: activityThreshold, agreement: agreementThreshold } = tasksService.getActivityAndAgreementThresholds(
    member.rank,
  );

  const isActivityFit =
    nonNullable(activity.activity) && nonNullable(activityThreshold) ? activity.activity >= activityThreshold : false;
  const isAgreementFit =
    nonNullable(activity.agreement) && nonNullable(agreementThreshold)
      ? activity.agreement >= agreementThreshold
      : false;

  return (
    <Box direction="row" gap={4}>
      <Box direction="row" gap={2} verticalAlign="center">
        <Icon size={16} name="checkmarkCutout" className={isActivityFit ? 'text-icon-positive' : 'text-icon-default'} />
        <Box direction="row" gap={1} verticalAlign="center">
          <FootnoteText className="text-text-secondary">{t('fellowship.members.activity')}</FootnoteText>
          <FootnoteText>
            {nonNullable(activity.activity) && nonNullable(activityThreshold)
              ? `${activity.activity}/${activityThreshold}%`
              : t('fellowship.n/a')}
          </FootnoteText>
        </Box>
      </Box>
      <Box direction="row" gap={2} verticalAlign="center">
        <Icon
          size={16}
          name="checkmarkCutout"
          className={isAgreementFit ? 'text-icon-positive' : 'text-icon-default'}
        />
        <Box direction="row" gap={1} verticalAlign="center">
          <FootnoteText className="text-text-secondary">{t('fellowship.members.agreement')}</FootnoteText>
          <FootnoteText>
            {nonNullable(activity.agreement) && nonNullable(agreementThreshold)
              ? `${activity.agreement}/${agreementThreshold}%`
              : t('fellowship.n/a')}
          </FootnoteText>
        </Box>
      </Box>
    </Box>
  );
});
