import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { basketUtils } from '@/entities/basket';
import { fellowshipTasksFeature } from '../model/feature';
import { tasks } from '../model/tasks';

export const Basket = memo(() => {
  const { t } = useI18n();
  const input = useUnit(fellowshipTasksFeature.input);
  const basketOperations = useUnit(tasks.$basketOperations);

  if (nullable(input?.account) || !basketUtils.isBasketAvailableForAccount(input.account)) return null;

  return (
    <Button size="sm" pallet="secondary" disabled={basketOperations.length === 0}>
      {t('fellowship.tasks.reviewBasket', { count: basketOperations.length })}
    </Button>
  );
});
