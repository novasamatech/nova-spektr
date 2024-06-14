import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Button, Header } from '@shared/ui';
import { Operation } from './Operation';
import { basketPageModel } from '../model/basket-page-model';
import { EmptyBasket } from './EmptyBasket';
import { SignOperation } from './SignOperation';

export const Basket = () => {
  const { t } = useI18n();

  const basketTxs = useUnit(basketPageModel.$basketTransactions);
  const selectedTxs = useUnit(basketPageModel.$selectedTxs);
  const invalidTxs = useUnit(basketPageModel.$invalidTxs);

  return (
    <section className="flex flex-col items-center relative h-full">
      <Header title={t('basket.title')} />

      {basketTxs.length > 0 && (
        <div className="overflow-y-auto w-full mt-4 h-full flex flex-col items-center">
          <div className="flex items-start w-[736px]">
            <Button variant="text" onClick={() => basketPageModel.events.allSelected()}>
              {t('basket.selectAll')}
            </Button>
          </div>

          <ul className="bg-block-background-default rounded-md flex divide-y flex-col gap-y-1.5 w-[736px]">
            {basketTxs.map((tx) => (
              <li key={tx.id}>
                <Operation
                  selected={selectedTxs.includes(tx.id)}
                  tx={tx}
                  errorText={invalidTxs.get(tx.id)?.errorText}
                  onSelect={() => basketPageModel.events.txSelected(tx.id)}
                  onClick={() => {
                    basketPageModel.events.txClicked(tx);
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {basketTxs.length === 0 && <EmptyBasket />}

      <SignOperation />
    </section>
  );
};
