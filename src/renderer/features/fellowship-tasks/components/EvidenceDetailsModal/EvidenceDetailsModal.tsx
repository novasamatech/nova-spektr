import { useStoreMap } from 'effector-react';
import { type PropsWithChildren, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HeaderTitleText, HelpText, Identicon, Markdown } from '@/shared/ui';
import { Account, Address, CollectiveRank } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { activity } from '../../model/activity';
import { fellowshipTasksFeature } from '../../model/feature';
import { identities } from '../../model/identity';
import { members } from '../../model/members';

import { Card } from './Card';

type Props = PropsWithChildren<{
  evidence: Evidence;
}>;

export const EvidenceDetailsModal = memo(({ evidence, children }: Props) => {
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
  const promoteEvent = useStoreMap({
    store: activity.$list,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => {
      const accountEvents = list.filter(a => a.accountId === accountId);
      return accountEvents.find(a => a.type === 'promoted') ?? null;
    },
  });
  const inductEvent = useStoreMap({
    store: activity.$list,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => {
      const accountEvents = list.filter(a => a.accountId === accountId);
      return accountEvents.find(a => a.type === 'imported') ?? null;
    },
  });

  let title = '';
  if (evidence.wish === 'Promotion') {
    title = t('fellowship.evidenceModal.titlePromotion');
  }
  if (evidence.wish === 'Retention') {
    title = t('fellowship.evidenceModal.titleRetention');
  }

  return (
    <Modal size="xl" height="full">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title>{title}</Modal.Title>
      <Modal.Content>
        <div className="grid h-full grid-cols-[293px,1fr] bg-main-app-background ps-5">
          <Box gap={4} padding={[5, 0]} shrink={0}>
            <Card>
              {nonNullable(member) && nonNullable(chain) && (
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
                      <CollectiveRank rank={member.rank} />
                    </Box>
                  </Box>
                </Box>
              )}
            </Card>
            <Card>
              <Box gap={4}>
                <HeaderTitleText>Voting record</HeaderTitleText>
              </Box>
            </Card>
            <Card>
              {nonNullable(identity) && (
                <Box gap={4}>
                  <HeaderTitleText>Member details</HeaderTitleText>
                  {nonNullable(identity.matrix) && (
                    <Box gap={0.5}>
                      <HelpText className="text-text-secondary">Matrix username:</HelpText>
                      <FootnoteText>{identity.matrix}</FootnoteText>
                    </Box>
                  )}
                  {nonNullable(member) && nonNullable(chain) && (
                    <Box gap={0.5}>
                      <HelpText className="text-text-secondary">Polkadot address</HelpText>
                      <FootnoteText>
                        <Address
                          address={toAddress(member.accountId, { prefix: chain.addressPrefix })}
                          variant="full"
                        />
                      </FootnoteText>
                    </Box>
                  )}
                  {nonNullable(member) && (
                    <Box gap={0.5}>
                      <HelpText className="text-text-secondary">Rank</HelpText>
                      <FootnoteText>
                        <CollectiveRank rank={member.rank} />
                        {nonNullable(promoteEvent) && promoteEvent.block}
                      </FootnoteText>
                    </Box>
                  )}
                </Box>
              )}
            </Card>
          </Box>
          <Box padding={5}>
            <Card>
              <Markdown>{evidence.content}</Markdown>
            </Card>
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
});
