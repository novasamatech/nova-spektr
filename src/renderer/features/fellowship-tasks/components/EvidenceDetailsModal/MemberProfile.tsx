import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { HeaderTitleText, Identicon } from '@/shared/ui';
import { Account, CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { fellowshipTasksFeature } from '../../model/feature';
import { identities } from '../../model/identity';
import { members } from '../../model/members';

import { Card } from './Card';

type Props = {
  evidence: Evidence;
};

export const MemberProfile = memo(({ evidence }: Props) => {
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
      <Box gap={4}>
        <Box direction="row" gap={2.25}>
          <Identicon address={member.accountId} size={48} />
          <Box gap={2}>
            <HeaderTitleText>
              <Account
                hideIcon
                hideAddress
                accountId={member.accountId}
                title={identity ? identityService.getFullName(identity) : undefined}
                chain={chain}
              />
            </HeaderTitleText>
            <CollectiveRank rank={member.rank} showName />
          </Box>
        </Box>
        {/*<Box gap={0.5}>*/}
        {/*  <HelpText className="text-text-secondary">Reporting period:</HelpText>*/}
        {/*  <FootnoteText>Test</FootnoteText>*/}
        {/*</Box>*/}
      </Box>
    </Card>
  );
});
