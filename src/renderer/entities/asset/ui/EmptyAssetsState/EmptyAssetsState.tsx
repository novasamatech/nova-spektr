import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

export const EmptyAssetsState = () => {
  const { t } = useI18n();

  return (
    <div className="hidden h-full w-full flex-col items-center justify-center gap-y-8 only:flex">
      <Graphics name="emptyList" alt={t('balances.emptyStateLabel')} size={178} />
      <BodyText align="center" className="text-text-tertiary">
        {t('balances.emptyStateLabel')}
        <br />
        {t('balances.emptyStateDescription')}
      </BodyText>
    </div>
  );
};
