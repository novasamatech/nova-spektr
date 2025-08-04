import { useStoreMap, useUnit } from 'effector-react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/shared/ui';
import { FootnoteText, SmallTitleText, TitleText } from '@/shared/ui/Typography';
import { Account } from '@/shared/ui-entities';
import { Markdown, Skeleton } from '@/shared/ui-kit';
import { Box } from '@/shared/ui-kit/Box/Box';
import { identityService } from '@/domains/network';
import { details } from '../model/details';
import { fellowshipReferendumsDetailsFeature } from '../model/feature';

import { Card } from './Card';

export const AdditionalContext = () => {
  const { t } = useTranslation();
  const evidence = useUnit(details.$evidence);
  const description = useUnit(details.$description);
  const pendingMeta = useUnit(details.$pendingMeta);

  const chain = useStoreMap({
    store: fellowshipReferendumsDetailsFeature.input,
    keys: [],
    fn: store => store?.chain ?? null,
  });

  const proposer = useUnit(details.$proposer);
  const memberId = proposer || evidence?.accountId;

  const identity = useStoreMap({
    store: details.$identities,
    keys: [memberId],
    fn: (list, [accountId]) => (accountId && list[accountId]) ?? null,
  });

  if (pendingMeta)
    return (
      <Card>
        <Box padding={6}>
          <Skeleton height="5lh" width="100%" />
        </Box>
      </Card>
    );

  if (!description?.trim())
    return (
      <Card>
        <Box padding={6} gap={4} horizontalAlign="center" verticalAlign="center">
          <Icon size={64} name="empty" />
          <SmallTitleText>{t('fellowship.evidenceModal.noAdditionalContext')}</SmallTitleText>
        </Box>
      </Card>
    );

  return (
    <Card>
      <Box padding={6} gap={4}>
        <TitleText>{t('fellowship.evidenceModal.additionalContext')}</TitleText>
        {memberId && chain ? (
          <Box direction="row" verticalAlign="center" gap={1}>
            <FootnoteText className="text-text-tertiary">{t('fellowship.evidenceModal.by')}</FootnoteText>
            <Account
              accountId={memberId}
              chain={chain}
              title={identity ? identityService.getFullName(identity) : undefined}
              hideExplorers
              hideAddress
            />
          </Box>
        ) : null}
        <Markdown>{description}</Markdown>
      </Box>
    </Card>
  );
};
