import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { InfoLink, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type Referendum, evidenceService } from '@/domains/collectives';

import { Card } from './Card';

type Props = {
  referendumId?: Referendum['id'];
  evidenceHash?: HexString;
};

export const AdditionalInfo = ({ referendumId, evidenceHash }: Props) => {
  const { t } = useI18n();

  return (
    <Card>
      <Box padding={6} gap={6}>
        <SmallTitleText>{t('fellowship.additional.title')}</SmallTitleText>
        <Box gap={4}>
          {referendumId ? (
            <InfoLink
              size="inherit"
              iconName="polkassembly"
              url={`https://collectives.polkassembly.io/referenda/${referendumId}`}
              withLinkIcon
            >
              {t('fellowship.additional.polkassembly')}
            </InfoLink>
          ) : null}
          {referendumId ? (
            <InfoLink
              size="inherit"
              iconName="subsquare"
              url={`https://collectives.subsquare.io/fellowship/referenda/${referendumId}`}
              withLinkIcon
            >
              {t('fellowship.additional.subsquare')}
            </InfoLink>
          ) : null}
          {evidenceHash ? (
            <InfoLink
              size="inherit"
              iconName="embed"
              url={`${evidenceService.getEvidenceIpfsUrl(evidenceHash)}`}
              withLinkIcon
            >
              {t('fellowship.additional.evidenceSource')}
            </InfoLink>
          ) : null}
        </Box>
      </Box>
    </Card>
  );
};
