import { memo } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, InfoLink, LabelHelpBox } from '@/shared/ui';
import { Box, Popover } from '@/shared/ui-kit';
import { type Track } from '@/domains/collectives';

type Props = {
  track: Track;
};

export const TrackDescription = memo(({ track }: Props) => {
  const { t } = useI18n();

  return (
    <Popover dialog align="start">
      <Popover.Trigger>
        <div>
          <LabelHelpBox>
            {t('fellowship.salary.promotionRankHelpLabel', {
              rank: toRomanNumeral(track.id),
              name: track.name.replace(/s$/, ''),
            })}
          </LabelHelpBox>
        </div>
      </Popover.Trigger>
      <Popover.Content>
        <Box padding={4} gap={2} width={90}>
          <FootnoteText as="ul" className="list-disc pl-3 text-text-secondary">
            <Trans t={t} i18nKey={`fellowship.salary.promotionHelpRank${track.id}`} components={{ li: <li /> }} />
          </FootnoteText>
          <InfoLink url="https://github.com/polkadot-fellows/manifesto/blob/main/manifesto.pdf">
            {t('fellowship.salary.promotionReadManifesto')}
          </InfoLink>
        </Box>
      </Popover.Content>
    </Popover>
  );
});
