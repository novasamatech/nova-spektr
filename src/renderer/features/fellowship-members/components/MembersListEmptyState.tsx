import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

export const MembersListEmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex grow flex-col items-center justify-center gap-2">
      <Graphics name="emptyList" size={64} />
      <FootnoteText>{t('fellowship.members.emptyList')}</FootnoteText>
    </div>
  );
};
