import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Box, Graphics } from '@/shared/ui-kit';

export const VotingHistoryListEmptyState = () => {
  const { t } = useI18n();

  return (
    <Box verticalAlign="center" horizontalAlign="center" gap={2} padding={4}>
      <Graphics name="emptyList" size={64} />
      <FootnoteText>{t('fellowship.votingHistory.emptyList')}</FootnoteText>
    </Box>
  );
};
