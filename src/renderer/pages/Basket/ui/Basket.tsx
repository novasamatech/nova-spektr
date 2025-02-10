import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import { BasketFilter, filter } from '@/features/basket-filter';
import { BasketOperations } from '@/features/basket-operations';

export const Basket = () => {
  const { t } = useI18n();

  const filteredTxs = useUnit(filter.$filteredTxs);

  return (
    <section className="relative flex h-full flex-col items-center">
      <Header title={t('basket.title')} />

      <div className="mt-4">
        <BasketFilter />
      </div>

      <BasketOperations operations={filteredTxs} />
    </section>
  );
};
