import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Button, Checkbox, ConfirmModal, FootnoteText, Header, SmallTitleText } from '@shared/ui';
import { Operation } from './Operation';
import { basketPageModel } from '../model/basket-page-model';
import { EmptyBasket } from './EmptyBasket';
import { SignOperation } from './SignOperation';
import { SignOperations } from './SignOperations';

export const Basket = () => {
  const { t } = useI18n();

  const basketTxs = useUnit(basketPageModel.$basketTransactions);
  const selectedTxs = useUnit(basketPageModel.$selectedTxs);
  const invalidTxs = useUnit(basketPageModel.$invalidTxs);
  const validTxs = useUnit(basketPageModel.$validTxs);
  const validatingTxs = useUnit(basketPageModel.$validatingTxs);
  const validationWarningShown = useUnit(basketPageModel.$validationWarningShown);

  return (
    <section className="flex flex-col items-center relative h-full">
      <Header title={t('basket.title')} />

      {basketTxs.length > 0 && (
        <div className="overflow-y-auto w-full mt-4 h-full flex flex-col items-center">
          <div className="flex items-start justify-between w-[736px]">
            <Button variant="text" onClick={() => basketPageModel.events.allSelected()}>
              {t('basket.selectAll')}
            </Button>

            <Button
              size="sm"
              className="w-[125px]"
              disabled={validatingTxs.size > 0 || selectedTxs.size === 0}
              onClick={() => basketPageModel.events.signStarted()}
            >
              {t(selectedTxs.size === 0 ? 'basket.emptySignButton' : 'basket.signButton')}
            </Button>
          </div>

          <ul className="bg-block-background-default rounded-md flex divide-y flex-col gap-y-1.5 w-[736px]">
            {basketTxs.map((tx) => (
              <>
                <li key={tx.id} className="flex gap-x-4 px-4">
                  <div className="flex justify-center items-center">
                    <Checkbox
                      disabled={Boolean(invalidTxs.get(tx.id))}
                      checked={selectedTxs.has(tx.id)}
                      onChange={() => basketPageModel.events.txSelected({ id: tx.id, value: !selectedTxs.has(tx.id) })}
                    />
                  </div>

                  <Operation
                    selected={selectedTxs.has(tx.id)}
                    tx={tx}
                    errorText={invalidTxs.get(tx.id)?.errorText}
                    onSelect={(value) => basketPageModel.events.txSelected({ id: tx.id, value })}
                    onClick={() => basketPageModel.events.txClicked(tx)}
                  />
                </li>
              </>
            ))}
          </ul>
        </div>
      )}

      {basketTxs.length === 1 && <EmptyBasket />}

      {validTxs.length === 1 ? <SignOperation /> : <SignOperations />}

      <ConfirmModal
        panelClass="w-[300px]"
        isOpen={validationWarningShown}
        confirmText={t('basket.validationWarning.proceedButton')}
        cancelText={t('basket.validationWarning.cancelButton')}
        onClose={basketPageModel.events.cancelValidationWarning}
        onConfirm={() => basketPageModel.events.proceedValidationWarning({ invalid: [], valid: validTxs })}
      >
        <SmallTitleText align="center">{t('basket.validationWarning.title')}</SmallTitleText>
        <FootnoteText className="mt-2 text-text-tertiary" align="center">
          {t('basket.validationWarning.description')}
        </FootnoteText>
      </ConfirmModal>
    </section>
  );
};
