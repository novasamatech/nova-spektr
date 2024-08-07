import { useI18n } from '@app/providers';
import { FootnoteText, Icon, SmallTitleText } from '@shared/ui';

export const EmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full h-full">
      <Icon name="document" alt={t('settings.networks.emptyStateLabel')} size={64} />
      <div className="flex flex-col items-center gap-2 max-w-[340px]">
        <SmallTitleText>{t('governance.addDelegation.emptyTitle')}</SmallTitleText>
        <FootnoteText className="text-center text-text-tertiary">
          {t('governance.addDelegation.emptyDescription')}
        </FootnoteText>
      </div>
    </div>
  );
};
