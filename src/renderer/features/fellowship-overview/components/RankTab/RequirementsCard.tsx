import { useUnit } from 'effector-react';
import { type MouseEvent, memo } from 'react';

import { $features } from '@/shared/config/features';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, InfoLink, TitleText } from '@/shared/ui';
import { Box, Surface } from '@/shared/ui-kit';
import { Markdown } from '@/shared/ui-kit/Markdown/Markdown';
import { FELLOWSHIP_TABS } from '../../model/constants';
import { modal } from '../../model/modal';
import { getRankDataByRank } from '../../utils/rankHelpers';

interface RequirementsCardProps {
  rankId: number;
}

export const RequirementsCard = memo(({ rankId }: RequirementsCardProps) => {
  const { t } = useI18n();
  const features = useUnit($features);
  const rankData = getRankDataByRank(rankId);

  if (!rankData) {
    return null;
  }

  const handleCodexClick = (e: MouseEvent) => {
    e.preventDefault();
    modal.switchTab(FELLOWSHIP_TABS.CODEX);
  };

  return (
    <Surface className="flex-1">
      <Box gap={4} padding={4}>
        <TitleText className="text-header-title">{t('fellowship.ranks.requirements')}</TitleText>
        <div className="flex items-center gap-6">
          <div className="min-w-0 flex-1">
            <Box gap={1}>
              <FootnoteText>{t('fellowship.ranks.activity')}</FootnoteText>
              <TitleText className="text-header-title">{rankData.meta.activity || t('fellowship.n/a')}</TitleText>
            </Box>
          </div>
          <div className="min-w-0 flex-1">
            <Box gap={1}>
              <FootnoteText>{t('fellowship.ranks.agreement')}</FootnoteText>
              <TitleText className="text-header-title">{rankData.meta.agreement || t('fellowship.n/a')}</TitleText>
            </Box>
          </div>
          <div className="min-w-0 flex-1">
            <Box gap={1}>
              <FootnoteText>{t('fellowship.ranks.fromIDan')}</FootnoteText>
              <TitleText className="text-header-title">{rankData.meta.timeRequired || t('fellowship.n/a')}</TitleText>
            </Box>
          </div>
        </div>

        <FootnoteText>
          {t('fellowship.ranks.activityDescription')}
          <br />
          {t('fellowship.ranks.agreementDescription')}
          {features.codex && (
            <>
              <br />
              {t('fellowship.ranks.detailsInCodexText')}{' '}
              <InfoLink url="#" onClick={handleCodexClick}>
                {t('fellowship.ranks.codex')}
              </InfoLink>
            </>
          )}
        </FootnoteText>

        <div className="h-px w-full bg-filter-border" />

        <Box gap={2}>
          <Markdown>{rankData.requirementsDescription}</Markdown>
        </Box>
      </Box>
    </Surface>
  );
});

RequirementsCard.displayName = 'RequirementsCard';
