import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Identicon, SmallTitleText } from '@/shared/ui';
import { Account, CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { fellowshipTasksFeature } from '../../model/feature';
import { identities } from '../../model/identity';
import { members } from '../../model/members';

import { Card } from './Card';
import { VotingRecord } from './VotingRecord';

type Props = {
  evidence: Evidence;
};

export const MemberProfile = memo(({ evidence }: Props) => {
  const { t } = useI18n();

  const chain = useStoreMap({
    store: fellowshipTasksFeature.input,
    keys: [],
    fn: store => store?.chain ?? null,
  });
  const member = useStoreMap({
    store: members.$list,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => list.find(m => m.accountId === accountId) ?? null,
  });
  const identity = useStoreMap({
    store: identities.$identities,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => list[accountId] ?? null,
  });

  if (nullable(member) || nullable(chain)) return null;

  return (
    <Card>
      <Box>
        <SmallTitleText className="mb-4">{t('fellowship.evidenceModal.member')}</SmallTitleText>
        <Box direction="row" verticalAlign="center" gap={2.25}>
          <Identicon address={member.accountId} size={48} />
          <Box gap={1.5}>
            <SmallTitleText>
              <Account
                hideIcon
                hideAddress
                accountId={member.accountId}
                title={identity ? identityService.getFullName(identity) : undefined}
                chain={chain}
              />
            </SmallTitleText>
            <CollectiveRank rank={member.rank} showName />
          </Box>
        </Box>
        <hr className="filter-border my-4" />
        <VotingRecord evidence={evidence} />
      </Box>
    </Card>
  );
});
