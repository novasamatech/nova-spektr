import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

export const EmptyBackendView = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-4">
      <Graphics name="emptyList" alt={t('addressBook.sources.emptyBackend')} size={178} />
      <BodyText className="text-text-tertiary">{t('addressBook.sources.emptyBackend')}</BodyText>
      <BodyText className="text-center text-text-tertiary">{t('addressBook.sources.emptyBackendDescription')}</BodyText>
    </div>
  );
};
