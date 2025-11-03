import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui';
import { Account, CollectiveRank, Identicon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService, useMembers } from '@/domains/collectives';
import { identityService, useIdentity } from '@/domains/network';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { useProposer } from '../hooks/useProposer';
import { useReferendumMetadata } from '../hooks/useReferendumMeta';

import { Card } from './Card';
import { VotingRecord } from './VotingRecord';

type Props = {
  referendum: Referendum | null;
  evidence: Evidence | null;
};

export const MemberProfile = memo(({ referendum, evidence }: Props) => {
  const { t } = useI18n();

  const chain = useFellowshipChain();
  const api = useFellowshipApi();

  const proposer = useProposer(referendum);
  const memberId = proposer || evidence?.accountId || null;

  const { data: referendumMeta } = useReferendumMetadata(referendum);
  const { data: members } = useMembers({ palletType: 'fellowship', api });
  const { data: identity } = useIdentity(memberId);

  const member = useMemo(() => {
    return members.find(m => m.accountId === proposer);
  }, [members, memberId]);

  const canHaveEvidence =
    evidence ||
    (nonNullable(referendum) &&
      nonNullable(referendumMeta) &&
      referendumService.isOngoing(referendum) &&
      (trackService.isPromotionTrack(referendumMeta.track) || trackService.isRetentionTrack(referendumMeta.track)));

  if (!canHaveEvidence || nullable(member) || nullable(chain)) return null;

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
        <hr className="filter-border my-4" />
        <VotingRecord referendum={referendum} evidence={evidence} />
      </Box>
    </Card>
  );
});
