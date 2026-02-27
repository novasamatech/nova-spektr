import { useI18n } from '@/shared/i18n';
import { BodyText, Icon } from '@/shared/ui';

export const EmptyBackendView = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-3 py-12">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-input-background-disabled">
        <Icon name="globe" size={20} className="text-text-tertiary" />
      </div>
      <BodyText className="text-text-tertiary">{t('addressBook.sources.emptyBackend')}</BodyText>
    </div>
  );
};
