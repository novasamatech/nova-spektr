import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type BasketTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';
import { selectOperations } from '../model/select';
import { signOperations } from '../model/sign';

import { EmptyBasket } from './EmptyBasket';
import { Operation } from './Operation';
import { SignOperation } from './SignOperation';
import { SignOperations } from './SignOperations';

type Props = {
  operations: BasketTransaction[];
};

export const BasketOperations = ({ operations }: Props) => {
  const { t } = useI18n();
  const selectedTxs = useUnit(selectOperations.$selectedTxs);

  const isSignAvailable = selectedTxs.length > 0;

  useEffect(() => {
    selectOperations.filterTxs(operations);
  }, [operations.length]);

  return (
    <>
      <div className="mt-4 flex w-full flex-col items-center gap-4">
        <div className="flex w-[736px] items-center justify-between">
          <div className="ml-3">
            <Checkbox
              checked={operations.length === selectedTxs.length}
              semiChecked={selectedTxs.length > 0 && operations.length !== selectedTxs.length}
              onChange={() => selectOperations.selectTxs(operations)}
            >
              <FootnoteText className="text-text-secondary">
                {t('basket.selectedStatus', { count: operations.length, selected: selectedTxs.length })}
              </FootnoteText>
            </Checkbox>
          </div>
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              className="w-[125px]"
              disabled={!isSignAvailable}
              onClick={() => signOperations.events.flowStarted({ transactions: selectedTxs, feeMap: {} })}
            >
              {t(selectedTxs.length === 0 ? 'basket.emptySignButton' : 'basket.signButton')}
            </Button>
          </div>
        </div>
      </div>

      {operations.length > 0 && (
        <div className="scrollbar-stable mt-4 flex w-full flex-col items-center gap-4 overflow-y-auto">
          <ul className="flex w-[736px] flex-col gap-y-1.5 divide-y rounded-md">
            {operations.map((tx) => (
              <li
                key={tx.id}
                className="flex gap-x-4 bg-block-background-default px-3"
                onClick={() => signOperations.events.flowStarted({ transactions: [tx], feeMap: {} })}
              >
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={selectedTxs.includes(tx)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      selectOperations.selectTx(tx);
                    }}
                  />
                </div>

                <Operation operation={tx} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {operations.length === 0 && <EmptyBasket />}

      {selectedTxs.length > 1 ? <SignOperations /> : <SignOperation />}
    </>
  );
};
