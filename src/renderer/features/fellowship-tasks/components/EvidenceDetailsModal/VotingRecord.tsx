import { useStoreMap } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { HeaderTitleText, HelpText, LargeTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type Evidence, memberService, referendumMetaService } from '@/domains/collectives';
import { fellowship } from '../../model/fellowship';
import { members } from '../../model/members';

import { Card } from './Card';

type Props = {
  evidence: Evidence;
};

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

  return (
    <Card>
      <Box gap={4}>
        <HeaderTitleText>{t('fellowship.evidenceModal.votingRecord')}</HeaderTitleText>
        <Box direction="row" width="100%">
          <Box width="100%" grow={1} gap={1.5}>
            <HelpText className="text-text-secondary">{t('fellowship.members.activity')}</HelpText>
            <LargeTitleText>
              {nonNullable(activity.activity) ? `${activity.activity}%` : t('fellowship.n/a')}
            </LargeTitleText>
          </Box>
          <Box width="100%" grow={1} gap={1.5}>
            <HelpText className="text-text-secondary">{t('fellowship.members.agreement')}</HelpText>
            <LargeTitleText>
              {nonNullable(activity.agreement) ? `${activity.agreement}%` : t('fellowship.n/a')}
            </LargeTitleText>
          </Box>
        </Box>
      </Box>
    </Card>
  );
});
