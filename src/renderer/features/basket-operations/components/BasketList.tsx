import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon } from '@/shared/ui';
import { Checkbox, Tooltip } from '@/shared/ui-kit';
import { type BasketTransaction } from '@/aggregates/basket-operations';
import { basketOperations } from '@/aggregates/basket-operations';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { list } from '../model/list';
import { signOperations } from '../model/sign';
import { validation } from '../model/validation';

import { BasketFilter } from './BasketFilter';
import { BasketItem } from './BasketItem';
import { EmptyBasket } from './EmptyBasket';
import { SignTransactionModal } from './SignTransactionModal';
import { SignTransactionsModal } from './SignTransactionsModal';

export const BasketList = () => {
  const { t } = useI18n();

  useFellowshipMember();

  const allOperations = useUnit(list.$all);
  const operations = useUnit(list.$filtered);
  const selected = useUnit(basketOperations.$selected);
  const transactionsToSign = useUnit(signOperations.$transactions);
  const pendingValidations = useUnit(validation.$pending);
  const refreshPending = useUnit(validation.validateAll.pending);
  const validationResults = useUnit(validation.$validatingResults);
  const apisFromChainsListConnected = useUnit(validation.$apisFromChainsListConnected);
  const hasIncompatibleSigningModes = useUnit(signOperations.$hasIncompatibleSigningModes);

  const validOperations = operations.filter(op => {
    const hasError = validationResults[op.id]?.some(result => result.errorText);
    const isPending = pendingValidations[op.id] ?? true;
    return !hasError && !isPending;
  });

  const isSignAvailable = selected.length > 0 && selected.every(operation => !pendingValidations[operation.id]);

  const isValidationPending = !apisFromChainsListConnected || refreshPending;

  const openSignModal = (transaction: BasketTransaction) => {
    signOperations.startFlow({ transactions: [transaction] });
  };

  const toggleSelection = (transaction: BasketTransaction) => {
    basketOperations.toggle(transaction.id);
  };

  return (
    <div className="flex grow flex-col gap-4 pt-4">
      <BasketFilter />

      {operations.length > 0 && (
        <>
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex w-[736px] items-center justify-between">
              <div className="ml-3">
                <Checkbox
                  checked={validOperations.length > 0 && validOperations.length === selected.length}
                  semiChecked={selected.length > 0 && validOperations.length !== selected.length}
                  disabled={validOperations.length === 0}
                  onChange={value => {
                    value
                      ? basketOperations.select(validOperations.map(x => x.id))
                      : basketOperations.deselect(validOperations.map(x => x.id));
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
                  isLoading={isValidationPending}
                  prefixElement={
                    <Icon
                      size={16}
                      name="refresh"
                      className={cnTw('text-inherit', isValidationPending ? 'animate-spin' : '')}
                    />
                  }
                  onClick={() => validation.validateAll()}
                >
                  {t('basket.refreshButton')}
                </Button>
                <Tooltip>
                  <Tooltip.Trigger>
                    <Button
                      size="sm"
                      className="w-[125px]"
                      disabled={!isSignAvailable || hasIncompatibleSigningModes}
                      onClick={() => signOperations.startFlow({ transactions: selected })}
                    >
                      {t(selected.length === 0 ? 'basket.emptySignButton' : 'basket.signButton')}
                    </Button>
                  </Tooltip.Trigger>
                  {hasIncompatibleSigningModes && (
                    <Tooltip.Content>{t('basket.incompatibleSigningModeError')}</Tooltip.Content>
                  )}
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="scrollbar-stable flex w-full flex-col items-center gap-4 overflow-y-auto">
            <ul className="flex w-[736px] flex-col gap-y-1.5 rounded-md">
              {operations.map(transaction => (
                <BasketItem
                  key={transaction.id}
                  transaction={transaction}
                  selected={nonNullable(selected.find(s => s.id === transaction.id))}
                  onSelect={toggleSelection}
                  onClick={openSignModal}
                />
              ))}
            </ul>
          </div>
        </>
      )}

      {operations.length === 0 && (
        <EmptyBasket
          text={
            allOperations.length === 0 ? 'basket.noOperationsDescription' : 'basket.noOperationsDescriptionFiltered'
          }
        />
      )}

      {transactionsToSign.length > 1 ? <SignTransactionsModal /> : <SignTransactionModal />}
    </div>
  );
};
