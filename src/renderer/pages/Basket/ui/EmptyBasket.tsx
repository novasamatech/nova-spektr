import { useI18n } from '@app/providers';
import { BodyText, Icon } from '@shared/ui';

export const EmptyBasket = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-4">
      <Icon as="img" name="emptyList" alt={t('basket.noOperationsLabel')} size={178} />
      <BodyText className="w-[300px] text-center text-text-tertiary">{t('basket.noOperationsDescription')}</BodyText>
    </div>
  );
};
