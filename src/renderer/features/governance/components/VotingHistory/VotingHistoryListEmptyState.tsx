import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';

export const VotingHistoryListEmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2">
      <Icon as="img" name="emptyList" size={64} />
      <FootnoteText>{t('governance.voteHistory.listEmptyState')}</FootnoteText>
    </div>
  );
};
