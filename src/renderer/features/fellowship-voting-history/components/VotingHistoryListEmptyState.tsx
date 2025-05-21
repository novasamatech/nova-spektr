import { useI18n } from '@/shared/i18n';
import { FootnoteText, HeaderTitleText } from '@/shared/ui';
import { Box, Graphics } from '@/shared/ui-kit';

export const VotingHistoryListEmptyState = () => {
  const { t } = useI18n();

  return (
    <Box verticalAlign="center" horizontalAlign="center" gap={2} padding={[14, 4, 4]}>
      <Graphics name="emptyList" size={160} />
      <HeaderTitleText>{t('fellowship.votingHistory.emptyListTitle')}</HeaderTitleText>
      <FootnoteText className="text-text-tertiary">{t('fellowship.votingHistory.emptyListDescription')}</FootnoteText>
    </Box>
  );
};
