import { useTranslation } from 'react-i18next';

import { toAddress } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { FootnoteText, SmallTitleText, TitleText } from '@/shared/ui/Typography';
import { Address } from '@/shared/ui-entities';
import { Markdown, Skeleton } from '@/shared/ui-kit';
import { Box } from '@/shared/ui-kit/Box/Box';
import { type Referendum } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { useFellowshipChain, useFellowshipIdentity } from '@/aggregates/fellowship-network';
import { useDescription } from '../hooks/useDescription';
import { useProposer } from '../hooks/useProposer';

import { Card } from './Card';

type Props = {
  referendum: Referendum | null;
};

export const AdditionalContext = ({ referendum }: Props) => {
  const { t } = useTranslation();

  const chain = useFellowshipChain();
  const { data: proposer } = useProposer(referendum);
  const { data: description, pending } = useDescription(referendum);
  const { data: identity } = useFellowshipIdentity(proposer?.accountId);

  if (pending) {
    return (
      <Card>
        <Box padding={6}>
          <Skeleton height="5lh" width="100%" />
        </Box>
      </Card>
    );
  }

  if (!description?.trim())
    return (
      <Card height="full">
        <Box padding={6} gap={4} horizontalAlign="center" verticalAlign="center" direction="column" fillContainer>
          <Icon size={64} name="empty" />
          <SmallTitleText>{t('fellowship.evidenceModal.noAdditionalContext')}</SmallTitleText>
        </Box>
      </Card>
    );

  return (
    <Card>
      <Box padding={6} gap={4}>
        <TitleText>{t('fellowship.evidenceModal.additionalContext')}</TitleText>
        {proposer && chain ? (
          <Box direction="row" verticalAlign="center" gap={1}>
            <FootnoteText className="text-text-tertiary">{t('fellowship.evidenceModal.by')}</FootnoteText>
            <Address
              address={toAddress(proposer.accountId)}
              title={identity ? identityService.getFullName(identity) : undefined}
              hideAddress
            />
          </Box>
        ) : null}
        <Markdown>{description}</Markdown>
      </Box>
    </Card>
  );
};
