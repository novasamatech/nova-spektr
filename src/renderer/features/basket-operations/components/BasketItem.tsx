import { useStoreMap, useUnit } from 'effector-react';

import { type BasketTransaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Checkbox } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { basketOperations } from '@/aggregates/basket-operations';
import { signOperations } from '../model/sign';
import { validation } from '../model/validation';

import { BasketOperationStatus } from './BasketOperationStatus';
import { RemoveOperation } from './RemoveOperation';

export const operationTitleSlot = createSlot<{ transaction: BasketTransaction }>();

export const BasketItem = ({ transaction }: { transaction: BasketTransaction }) => {
  const { t } = useI18n();

  const selected = useUnit(basketOperations.$selected);
  const validationResult = useStoreMap({
    store: validation.$validatingResults,
    keys: [transaction.id],
    fn(results, [id]) {
      return results[id] ?? [];
    },
  });
  const pendingValidation = useStoreMap({
    store: validation.$pending,
    keys: [transaction.id],
    fn(pending, [id]) {
      return pending[id] ?? false;
    },
  });

  const disabled = validationResult.length !== 0 || pendingValidation;

  return (
    <li
      key={transaction.id}
      className="grid h-[52px] grid-cols-[40px,398px,135px,124px,28px] items-center bg-block-background-default"
    >
      <div className="flex items-center justify-center">
        <Checkbox
          checked={nonNullable(selected.find(s => s.id === transaction.id))}
          disabled={disabled}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            basketOperations.toggle(transaction.id);
          }}
        />
      </div>

      <div
        className="flex h-full w-full items-center gap-x-4 overflow-hidden px-2"
        onClick={() => {
          if (!disabled) {
            signOperations.events.flowStarted({ transactions: [transaction], feeMap: {} });
          }
        }}
      >
        <Slot id={operationTitleSlot} props={{ transaction }} />
      </div>

      <ChainTitle chainId={transaction.coreTx.chainId} className="px-2" />

      <div className="px-2">
        <BasketOperationStatus
          validating={pendingValidation}
          errorText={validationResult.map(x => t(x.errorText)).join('\n')}
          error={transaction.error}
        />
      </div>

      <div className="px-1">
        <RemoveOperation operation={transaction} />
      </div>
    </li>
  );
};
