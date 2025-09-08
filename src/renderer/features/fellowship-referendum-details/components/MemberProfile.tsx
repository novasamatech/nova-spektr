import { useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui';
import { Account, CollectiveRank, Identicon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Evidence, type Referendum, referendumService, trackService } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { details } from '../model/details';
import { fellowshipReferendumsDetailsFeature } from '../model/feature';

import { Card } from './Card';
import { VotingRecord } from './VotingRecord';

type Props = {
  referendum?: Referendum;
  evidence?: Evidence;
};

export const MemberProfile = memo(({ referendum, evidence }: Props) => {
  const { t } = useI18n();

  const chain = useStoreMap({
    store: fellowshipReferendumsDetailsFeature.input,
    keys: [],
    fn: store => store?.chain ?? null,
  });

  const proposer = useUnit(details.$proposer);
  const memberId = proposer || evidence?.accountId;

  const member = useStoreMap({
    store: details.$members,
    keys: [memberId],
    fn: (members, [accountId]) => (accountId && members[accountId]) ?? null,
  });

  const identity = useStoreMap({
    store: details.$identities,
    keys: [memberId],
    fn: (list, [accountId]) => (accountId && list[accountId]) ?? null,
  });

  const referendumMeta = useUnit(details.$referendumMeta);

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
        <VotingRecord evidence={evidence} />
      </Box>
    </Card>
  );
});
