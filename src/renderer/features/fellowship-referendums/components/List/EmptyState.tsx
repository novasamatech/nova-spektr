import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

export const EmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-y-8">
      <Graphics name="emptyList" alt={t('governance.emptyStateLabel')} size={178} />
      <BodyText align="center" className="text-text-tertiary">
        {t('governance.emptyStateLabel')}
        <br />
        {t('governance.emptyStateDescription')}
      </BodyText>
    </div>
  );
};
