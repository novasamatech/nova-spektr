import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, Icon } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';
import { basketOperations } from '@/aggregates/basket-operations';
import { list } from '../model/list';
import { signOperations } from '../model/sign';
import { validation } from '../model/validation';

import { BasketFilter } from './BasketFilter';
import { BasketItem } from './BasketItem';
import { EmptyBasket } from './EmptyBasket';
import { SignOperationModal } from './SignOperationModal';
import { SignOperationsModal } from './SignOperationsModal';

export const BasketList = () => {
  const { t } = useI18n();

  const operations = useUnit(list.$filtered);
  const selected = useUnit(basketOperations.$selected);
  const refreshPending = useUnit(validation.validateAll.pending);

  const isSignAvailable = selected.length > 0;

  return (
    <div className="flex flex-col gap-4 pt-4">
      <BasketFilter />
      <div className="flex w-full flex-col items-center gap-4">
        <div className="flex w-[736px] items-center justify-between">
          <div className="ml-3">
            <Checkbox
              checked={operations.length > 0 && operations.length === selected.length}
              semiChecked={selected.length > 0 && operations.length !== selected.length}
              onChange={value => {
                value
                  ? basketOperations.select(operations.map(x => x.id))
                  : basketOperations.deselect(operations.map(x => x.id));
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
              variant="text"
              isLoading={refreshPending}
              prefixElement={<Icon size={16} name="refresh" className="text-inherit" />}
              onClick={() => validation.validateAll()}
            >
              {t('basket.refreshButton')}
            </Button>
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
        <div className="scrollbar-stable flex w-full flex-col items-center gap-4 overflow-y-auto">
          <ul className="flex w-[736px] flex-col gap-y-1.5 divide-y rounded-md">
            {operations.map(transaction => (
              <BasketItem key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        </div>
      )}

      {operations.length === 0 && <EmptyBasket />}

      {selected.length > 1 ? <SignOperationsModal /> : <SignOperationModal />}
    </div>
  );
};
