import { useUnit } from 'effector-react';

import { type BasketTransaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';
import { basketOperations } from '@/aggregates/basket-operations';
import { signOperations } from '../model/sign';

import { EmptyBasket } from './EmptyBasket';
import { RemoveOperation } from './RemoveOperation';
import { SignOperation } from './SignOperation';
import { SignOperations } from './SignOperations';

type Props = {
  operations: BasketTransaction[];
};

export const operationTitleSlot = createSlot<{ operation: BasketTransaction }>();

export const BasketOperations = ({ operations }: Props) => {
  const { t } = useI18n();

  const selected = useUnit(basketOperations.$selected);

  const isSignAvailable = selected.length > 0;

  return (
    <>
      <div className="mt-4 flex w-full flex-col items-center gap-4">
        <div className="flex w-[736px] items-center justify-between">
          <div className="ml-3">
            <Checkbox
              checked={operations.length > 0 && operations.length === selected.length}
              semiChecked={selected.length > 0 && operations.length !== selected.length}
              onChange={(value) => {
                value
                  ? basketOperations.select(operations.map((x) => x.id))
                  : basketOperations.deselect(operations.map((x) => x.id));
              }}
            >
              <FootnoteText className="text-text-secondary">
                {t('basket.selectedStatus', { count: operations.length, selected: selected.length })}
              </FootnoteText>
            </Checkbox>
          </div>
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              className="w-[125px]"
              disabled={!isSignAvailable}
              onClick={() => signOperations.events.flowStarted({ transactions: selected, feeMap: {} })}
            >
              {t(selected.length === 0 ? 'basket.emptySignButton' : 'basket.signButton')}
            </Button>
          </div>
        </div>
      </div>

      {operations.length > 0 && (
        <div className="scrollbar-stable mt-4 flex w-full flex-col items-center gap-4 overflow-y-auto">
          <ul className="flex w-[736px] flex-col gap-y-1.5 divide-y rounded-md">
            {operations.map((operation) => (
              <li key={operation.id} className="flex gap-x-4 bg-block-background-default px-3">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={selected.includes(operation)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      basketOperations.toggle(operation.id);
                    }}
                  />
                </div>

                <div
                  className="flex h-[52px] w-full items-center gap-x-4 overflow-hidden"
                  onClick={() => signOperations.events.flowStarted({ transactions: [operation], feeMap: {} })}
                >
                  <Slot id={operationTitleSlot} props={{ operation }} />
                </div>

                <RemoveOperation operation={operation} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {operations.length === 0 && <EmptyBasket />}

      {selected.length > 1 ? <SignOperations /> : <SignOperation />}
    </>
  );
};
