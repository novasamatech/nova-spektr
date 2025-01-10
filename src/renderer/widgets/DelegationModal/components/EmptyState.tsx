import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';

export const EmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <Icon name="document" size={64} />
      <div className="flex max-w-[340px] flex-col items-center gap-2">
        <SmallTitleText>{t('governance.addDelegation.emptyTitle')}</SmallTitleText>
        <FootnoteText className="text-center text-text-tertiary">
          {t('governance.addDelegation.emptyDescription')}
        </FootnoteText>
      </div>
    </div>
  );
};
