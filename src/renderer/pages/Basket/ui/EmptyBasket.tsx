import { useI18n } from '@app/providers';

import { BodyText, Icon } from '@shared/ui';

export const EmptyBasket = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-y-4 h-full">
      <Icon as="img" name="emptyList" alt={t('basket.noOperationsLabel')} size={178} />
      <BodyText className="text-text-tertiary w-[300px] text-center">{t('basket.noOperationsDescription')}</BodyText>
    </div>
  );
};
