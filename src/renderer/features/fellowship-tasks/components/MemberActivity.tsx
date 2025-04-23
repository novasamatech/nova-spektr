import { useStoreMap } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { memberService, referendumMetaService } from '@/domains/collectives';
import { fellowship } from '../model/fellowship';
import { members } from '../model/members';

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

  if (nullable(member) || !memberService.isCoreMember(member)) return null;

  const referendums = useMemo(() => {
    return referendumMetaService.getReferendumsSinceLastProof(meta, member, maxRank);
  }, [meta, member, maxRank]);
  const activity = useMemo(() => {
    return referendumMetaService.getActivityInfo(referendums, votes);
  }, [referendums, votes]);

  return (
    <Box direction="row" gap={4}>
      <Box direction="row" gap={1}>
        <FootnoteText className="text-text-secondary">{t('fellowship.members.activity')}</FootnoteText>
        <FootnoteText>{nonNullable(activity.activity) ? `${activity.activity}/40%` : t('fellowship.n/a')}</FootnoteText>
      </Box>
      <Box direction="row" gap={1}>
        <FootnoteText className="text-text-secondary">{t('fellowship.members.agreement')}</FootnoteText>
        <FootnoteText>
          {nonNullable(activity.agreement) ? `${activity.agreement}/47%` : t('fellowship.n/a')}
        </FootnoteText>
      </Box>
    </Box>
  );
});
