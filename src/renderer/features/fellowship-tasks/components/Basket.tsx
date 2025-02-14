import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { basketUtils } from '@/entities/basket';
import { basketOperations } from '@/aggregates/basket-operations';
import { SignOperations, signOperations } from '@/features/basket-operations';
import { fellowshipTasksFeature } from '../model/feature';
import { tasks } from '../model/tasks';

export const Basket = memo(() => {
  const { t } = useI18n();
  const input = useUnit(fellowshipTasksFeature.input);
  const transactions = useUnit(tasks.$basketOperations);

  if (nullable(input?.account) || !basketUtils.isBasketAvailableForAccount(input.account)) return null;

  const openSigning = () => {
    basketOperations.select(transactions.map(x => x.id));
    signOperations.events.flowStarted({ transactions, feeMap: {} });
  };

  return (
    <>
      <Button size="sm" pallet="secondary" disabled={transactions.length === 0} onClick={openSigning}>
        {t('fellowship.tasks.reviewBasket', { count: transactions.length })}
      </Button>
      <SignOperations />
    </>
  );
});
