import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable, toAddress } from '@/shared/lib/utils';
import { Separator, SmallTitleText } from '@/shared/ui';
import { Account, CollectiveRank, Identicon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Evidence, type Referendum, useEvidenceToReferendumRelations, useMembers } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { useFellowshipApi, useFellowshipChain, useFellowshipIdentity } from '@/aggregates/fellowship-network';

import { Card } from './Card';
import { VotingRecord } from './VotingRecord';

type Props = {
  referendum: Referendum | null;
  evidence: Evidence | null;
};

export const MemberProfile = memo(({ referendum, evidence }: Props) => {
  const { t } = useI18n();

  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: members } = useMembers({ palletType: 'fellowship', api });
  const { data: evidenceToReferendumRelations } = useEvidenceToReferendumRelations({ palletType: 'fellowship', chain });

  const member = useMemo(() => {
    const evidenceToReferendumRelation = evidenceToReferendumRelations.find(x => x.referendumId === referendum?.id);

    const potentialMemberId = evidence?.accountId || evidenceToReferendumRelation?.proposer;
    return members.find(m => m.accountId === potentialMemberId) ?? null;
  }, [evidence, evidenceToReferendumRelations, members, referendum]);

  const { data: identity } = useFellowshipIdentity(member?.accountId);

  if (nullable(member) || nullable(chain)) return null;

  return (
    <Card>
      <Box padding={6}>
        <SmallTitleText className="mb-4">{t('fellowship.evidenceModal.member')}</SmallTitleText>
        <Box direction="row" verticalAlign="center" gap={1.25}>
          <Identicon address={toAddress(member.accountId)} size={52} />
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
        <Separator className="my-4" />
        <VotingRecord referendum={referendum} evidence={evidence} />
      </Box>
    </Card>
  );
});
