import { useStoreMap } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, Icon } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { memberService, referendumMetaService } from '@/domains/collectives';
import { fellowship } from '../model/fellowship';
import { members } from '../model/members';

type Props = {
  accountId: AccountId;
};

const DEFAULT_VALUE = '100/100%';

export const MemberActivity = memo(({ accountId }: Props) => {
  const { t } = useI18n();

  const member = useStoreMap({
    store: members.$list,
    keys: [accountId],
    fn: (list, [accountId]) => list.find(m => m.accountId === accountId) ?? null,
  });

  const { meta, isMetaLoaded, votes, maxRank } = useStoreMap({
    store: fellowship.$store,
    keys: [],
    fn: store => {
      return {
        meta: Object.values(store?.referendumMeta ?? {}),
        isMetaLoaded: nonNullable(store?.referendumMeta),
        votes: store?.voting ?? [],
        maxRank: store?.maxRank ?? 0,
      };
    },
  });

  const notMemberOrNotCoreMember = nullable(member) || !memberService.isCoreMember(member);

  const referendums = useMemo(() => {
    if (notMemberOrNotCoreMember) return [];

    return referendumMetaService.getReferendumsSinceLastProof(meta, member);
  }, [meta, member, notMemberOrNotCoreMember]);
  const activity = useMemo(() => {
    if (notMemberOrNotCoreMember) {
      return { activity: null, agreement: null };
    }

    return referendumMetaService.getActivityInfo(referendums, member, maxRank, votes);
  }, [referendums, member, maxRank, votes, notMemberOrNotCoreMember]);

  if (notMemberOrNotCoreMember) return null;

  const { activity: activityThreshold, agreement: agreementThreshold } =
    memberService.getActivityAndAgreementThresholds(member.rank);

  const isActivityLoaded = isMetaLoaded && nonNullable(activity);

  const isActivityFit =
    nullable(activityThreshold) || (nonNullable(activity?.activity) && activity?.activity >= activityThreshold);
  const isAgreementFit =
    nullable(agreementThreshold) || (nonNullable(activity?.agreement) && activity?.agreement >= agreementThreshold);

  return (
    <Box direction="row" gap={4}>
      <Box direction="row" gap={2} verticalAlign="center">
        <Icon
          size={16}
          name={isActivityFit ? 'positive' : 'negative'}
          className={cnTw({
            'text-icon-positive': isActivityFit,
            'text-icon-negative': !isActivityFit,
          })}
        />
        <Box direction="row" gap={1} verticalAlign="center">
          <FootnoteText className="text-text-secondary">{t('fellowship.members.activity')}</FootnoteText>
          <FootnoteText>
            {isActivityLoaded ? (
              nonNullable(activity.activity) ? (
                nonNullable(activityThreshold) ? (
                  `${Math.min(activity.activity, activityThreshold)}/${activityThreshold}%`
                ) : (
                  DEFAULT_VALUE
                )
              ) : (
                t('fellowship.n/a')
              )
            ) : (
              <Skeleton width="8ch" height="1lh" />
            )}
          </FootnoteText>
        </Box>
      </Box>
      <Box direction="row" gap={2} verticalAlign="center">
        <Icon
          size={16}
          name={isAgreementFit ? 'positive' : 'negative'}
          className={cnTw({
            'text-icon-positive': isAgreementFit,
            'text-icon-negative': !isAgreementFit,
          })}
        />
        <Box direction="row" gap={1} verticalAlign="center">
          <FootnoteText className="text-text-secondary">{t('fellowship.members.agreement')}</FootnoteText>
          <FootnoteText>
            {isActivityLoaded ? (
              nonNullable(activity.agreement) ? (
                nonNullable(agreementThreshold) ? (
                  `${Math.min(activity.agreement, agreementThreshold)}/${agreementThreshold}%`
                ) : (
                  DEFAULT_VALUE
                )
              ) : (
                t('fellowship.n/a')
              )
            ) : (
              <Skeleton width="8ch" height="1lh" />
            )}
          </FootnoteText>
        </Box>
      </Box>
    </Box>
  );
});
