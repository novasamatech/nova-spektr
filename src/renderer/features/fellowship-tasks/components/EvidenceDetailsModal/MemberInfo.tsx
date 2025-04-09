import { useStoreMap } from 'effector-react';
import { memo } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HeaderTitleText, HelpText } from '@/shared/ui';
import { Address, BlockTime, CollectiveRank } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Evidence, memberService } from '@/domains/collectives';
import { activity } from '../../model/activity';
import { fellowshipTasksFeature } from '../../model/feature';
import { identities } from '../../model/identity';
import { members } from '../../model/members';

import { Card } from './Card';

type Props = {
  evidence: Evidence;
};

export const MemberInfo = memo(({ evidence }: Props) => {
  const { t } = useI18n();

  const chain = useStoreMap({
    store: fellowshipTasksFeature.input,
    keys: [],
    fn: store => store?.chain ?? null,
  });
  const api = useStoreMap({
    store: fellowshipTasksFeature.input,
    keys: [],
    fn: store => store?.api ?? null,
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
  const inductEvent = useStoreMap({
    store: activity.$list,
    keys: [evidence.accountId],
    fn: (list, [accountId]) => {
      const accountEvents = list.filter(a => a.accountId === accountId);
      return accountEvents.find(a => a.type === 'imported') ?? null;
    },
  });
  const evidenceEvent = useStoreMap({
    store: activity.$list,
    keys: [evidence.accountId, evidence.wish],
    fn: (list, [accountId, wish]) => {
      const accountEvents = list.filter(a => a.accountId === accountId);
      return accountEvents.filter(a => a.type === 'requested' && a.wish === wish).at(1) ?? null;
    },
  });

  return (
    <Card>
      {nonNullable(identity) && (
        <Box gap={4}>
          <HeaderTitleText>{t('fellowship.evidenceModal.memberDetails')}</HeaderTitleText>
          {nonNullable(identity.matrix) && (
            <Box gap={0.5}>
              <HelpText className="text-text-secondary">{t('fellowship.evidenceModal.matrixUsername')}</HelpText>
              <FootnoteText>{identity.matrix}</FootnoteText>
            </Box>
          )}
          {nonNullable(member) && nonNullable(chain) && (
            <Box gap={0.5}>
              <HelpText className="text-text-secondary">{t('fellowship.evidenceModal.polkadotAddress')}</HelpText>
              <FootnoteText>
                <Address address={toAddress(member.accountId, { prefix: chain.addressPrefix })} variant="full" />
              </FootnoteText>
            </Box>
          )}
          {nonNullable(api) && nonNullable(member) && (
            <Box gap={0.5}>
              <HelpText className="text-text-secondary">{t('fellowship.evidenceModal.currentRank')}</HelpText>
              <FootnoteText className="flex gap-2">
                <CollectiveRank rank={member.rank} />
                {memberService.isCoreMember(member) && member.lastPromotion > 0 && (
                  <span>
                    <Trans
                      t={t}
                      i18nKey="fellowship.evidenceModal.promotedAt"
                      components={{
                        time: <BlockTime block={member.lastPromotion} api={api} />,
                      }}
                    />
                  </span>
                )}
              </FootnoteText>
            </Box>
          )}
          {nonNullable(api) && nonNullable(inductEvent) && (
            <Box gap={0.5}>
              <HelpText className="text-text-secondary">
                {t('fellowship.evidenceModal.dateOfInitialInduction')}
              </HelpText>
              <FootnoteText>
                <BlockTime block={inductEvent.block} api={api} />
              </FootnoteText>
            </Box>
          )}
          {nonNullable(api) && nonNullable(evidenceEvent) && (
            <Box gap={0.5}>
              <HelpText className="text-text-secondary">{t('fellowship.evidenceModal.dateOfLastReport')}</HelpText>
              <FootnoteText>
                <BlockTime block={evidenceEvent.block} api={api} />
              </FootnoteText>
            </Box>
          )}
        </Box>
      )}
    </Card>
  );
});
