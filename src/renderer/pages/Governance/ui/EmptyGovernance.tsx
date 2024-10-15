import { useI18n } from '@/shared/i18n';
import { BodyText, Icon } from '@/shared/ui';

export const EmptyGovernance = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-y-8">
      <Icon as="img" name="emptyList" alt={t('governance.emptyStateLabel')} size={178} />
      <BodyText align="center" className="text-text-tertiary">
        {t('governance.emptyStateLabel')}
        <br />
        {t('governance.emptyStateDescription')}
      </BodyText>
    </div>
  );
};
