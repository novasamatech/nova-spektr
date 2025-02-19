import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import { BasketList } from '@/features/basket-operations';

export const Basket = () => {
  const { t } = useI18n();

  return (
    <section className="relative flex h-full flex-col items-center">
      <Header title={t('basket.title')} />

      <BasketList />
    </section>
  );
};
