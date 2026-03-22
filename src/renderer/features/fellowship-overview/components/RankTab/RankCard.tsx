import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, TitleText } from '@/shared/ui';
import { Box, Surface } from '@/shared/ui-kit';
import { Markdown } from '@/shared/ui-kit/Markdown/Markdown';
import { getRankDataByRank, getRankIcon } from '../../utils/rankHelpers';

interface RankCardProps {
  rankId: number;
  isCurrentRank?: boolean;
}

export const RankCard = memo(({ rankId, isCurrentRank = false }: RankCardProps) => {
  const { t } = useI18n();
  const rankData = getRankDataByRank(rankId);

  if (!rankData) {
    return null;
  }

  const RankIcon = getRankIcon(rankId);

  return (
    <Surface className="flex-1">
      <Box gap={4} padding={4}>
        <Box direction="row" gap={4} horizontalAlign="flex-start" verticalAlign="center">
          {RankIcon && <RankIcon className="h-16 w-16 shrink-0" />}

          <Box gap={1.5} grow={1}>
            <Box direction="row" gap={2} horizontalAlign="space-between" verticalAlign="center">
              <TitleText className="text-header-title">
                {rankData.label} {rankData.name}
              </TitleText>
              {isCurrentRank && (
                <span className="text-footnote text-text-positive">{t('fellowship.ranks.youreHere')}</span>
              )}
            </Box>

            <Box gap={0}>
              <FootnoteText>
                <span>{t('fellowship.ranks.approxAcademicAnalogue')} </span>
                <span className="font-bold">{rankData.meta.analogue || t('fellowship.n/a')}</span>
              </FootnoteText>
              <FootnoteText>
                <span>{t('fellowship.ranks.material')} </span>
                <span className="font-bold">{rankData.meta.material || t('fellowship.n/a')}</span>
              </FootnoteText>
            </Box>
          </Box>
        </Box>

        <Box gap={3}>
          <Markdown>{rankData.description}</Markdown>
        </Box>
      </Box>
    </Surface>
  );
});

RankCard.displayName = 'RankCard';
