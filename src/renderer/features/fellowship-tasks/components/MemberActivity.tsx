import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, Icon } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { memberService, useMember } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { useActivity } from '../hooks/useActivity';

type Props = {
  accountId: AccountId;
};

const DEFAULT_VALUE = '100/100%';

export const MemberActivity = memo(({ accountId }: Props) => {
  const { t } = useI18n();

  const api = useFellowshipApi();
  const { data: member } = useMember({ palletType: 'fellowship', api, accountId });
  const { data, pending } = useActivity(accountId);

  const notMemberOrNotCoreMember = nullable(member) || !memberService.isCoreMember(member);
  if (notMemberOrNotCoreMember) return null;

  const isActivityLoaded = !pending && nonNullable(data);

  const isActivityFit = data?.isActivityFit ?? false;
  const isAgreementFit = data?.isAgreementFit ?? false;

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
              nonNullable(data.activity) ? (
                nonNullable(data.activityThreshold) ? (
                  `${Math.min(data.activity, data.activityThreshold)}/${data.activityThreshold}%`
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
              nonNullable(data.agreement) ? (
                nonNullable(data.agreementThreshold) ? (
                  `${Math.min(data.agreement, data.agreementThreshold)}/${data.agreementThreshold}%`
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
