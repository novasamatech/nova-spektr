import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { InfoLink, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type Referendum, $primaryIpfsGateway, evidenceService } from '@/domains/collectives';

import { Card } from './Card';

type Props = {
  referendumId?: Referendum['id'];
  evidenceHash?: HexString | null;
};

export const AdditionalInfo = memo(({ referendumId, evidenceHash }: Props) => {
  const { t } = useI18n();
  const primaryGateway = useUnit($primaryIpfsGateway);

  if (nullable(referendumId) && nullable(evidenceHash)) {
    return null;
  }

  return (
    <Card>
      <Box padding={6} gap={6}>
        <SmallTitleText>{t('fellowship.additional.title')}</SmallTitleText>
        <Box gap={4}>
          {nonNullable(referendumId) ? (
            <InfoLink
              size="inherit"
              iconName="polkassembly"
              url={`https://collectives.polkassembly.io/referenda/${referendumId}`}
              withLinkIcon
            >
              {t('fellowship.additional.polkassembly')}
            </InfoLink>
          ) : null}
          {nonNullable(referendumId) ? (
            <InfoLink
              size="inherit"
              iconName="subsquare"
              url={`https://collectives.subsquare.io/fellowship/referenda/${referendumId}`}
              withLinkIcon
            >
              {t('fellowship.additional.subsquare')}
            </InfoLink>
          ) : null}
          {nonNullable(evidenceHash) ? (
            <InfoLink
              size="inherit"
              iconName="embed"
              url={`${evidenceService.getEvidenceFetchIpfsUrl(evidenceHash, primaryGateway)}`}
              withLinkIcon
            >
              {t('fellowship.additional.evidenceSource')}
            </InfoLink>
          ) : null}
        </Box>
      </Box>
    </Card>
  );
});
