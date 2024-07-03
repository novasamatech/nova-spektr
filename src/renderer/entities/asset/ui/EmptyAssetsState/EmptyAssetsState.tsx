import { useI18n } from '@app/providers';
import { Icon, BodyText } from '@shared/ui';

export const EmptyAssetsState = () => {
  const { t } = useI18n();

  return (
    <div className="hidden only:flex flex-col items-center justify-center gap-y-8 w-full h-full">
      <Icon as="img" name="emptyList" alt={t('balances.emptyStateLabel')} size={178} />
      <BodyText align="center" className="text-text-tertiary">
        {t('balances.emptyStateLabel')}
        <br />
        {t('balances.emptyStateDescription')}
      </BodyText>
    </div>
  );
};
