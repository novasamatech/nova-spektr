import { useI18n } from '@app/providers';

import { FootnoteText, Icon } from '@shared/ui';

export const VotingHistoryListEmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2 items-center justify-center min-h-32">
      <Icon as="img" name="emptyList" size={64} />
      <FootnoteText>{t('governance.voteHistory.listEmptyState')}</FootnoteText>
    </div>
  );
};
