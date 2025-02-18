import { useStoreMap } from 'effector-react';

import { type BasketTransaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Checkbox } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { validation } from '../model/validation';

import { BasketOperationStatus } from './BasketOperationStatus';
import { RemoveOperation } from './RemoveOperation';

export const operationTitleSlot = createSlot<{ transaction: BasketTransaction }>();

type Props = {
  transaction: BasketTransaction;
  selected: boolean;
  onSelect: (transaction: BasketTransaction) => void;
  onClick: (tx: BasketTransaction) => void;
};

export const BasketItem = ({ transaction, selected, onSelect, onClick }: Props) => {
  const { t } = useI18n();

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
      className="grid h-[52px] grid-cols-[40px,398px,135px,124px,auto] items-stretch bg-block-background-default"
    >
      <div className="flex items-center justify-center">
        <Checkbox checked={selected} disabled={disabled} onClick={() => onSelect(transaction)} />
      </div>

      <div
        className="flex h-full w-full items-center gap-x-4 overflow-hidden px-2"
        onClick={() => {
          if (!disabled) {
            onClick(transaction);
          }
        }}
      >
        <Slot id={operationTitleSlot} props={{ transaction }} />
      </div>

      <ChainTitle chainId={transaction.coreTx.chainId} className="px-2" />

      <div className="flex items-center justify-center px-2">
        <BasketOperationStatus
          validating={pendingValidation}
          errorText={validationResult.map(x => t(x.errorText)).join('\n')}
          error={transaction.error}
        />
      </div>

      <div className="flex items-center justify-center px-1">
        <RemoveOperation operation={transaction} />
      </div>
    </li>
  );
};
