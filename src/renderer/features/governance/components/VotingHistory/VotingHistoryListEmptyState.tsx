import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

export const VotingHistoryListEmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2">
      <Graphics name="emptyList" size={64} />
      <FootnoteText>{t('governance.voteHistory.listEmptyState')}</FootnoteText>
    </div>
  );
};
