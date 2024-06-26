import { useEffect } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Button, Checkbox, ConfirmModal, FootnoteText, Header, Icon, Shimmering, SmallTitleText } from '@shared/ui';
import { Operation } from './Operation';
import { basketPageModel } from '../model/basket-page-model';
import { EmptyBasket } from './EmptyBasket';
import { SignOperation } from './SignOperation';
import { SignOperations } from './SignOperations';
import { networkModel } from '@/src/renderer/entities/network';

export const Basket = () => {
  const { t } = useI18n();

  const basketTxs = useUnit(basketPageModel.$basketTransactions);
  const apis = useUnit(networkModel.$apis);
  const selectedTxs = useUnit(basketPageModel.$selectedTxs);
  const invalidTxs = useUnit(basketPageModel.$invalidTxs);
  const validTxs = useUnit(basketPageModel.$validTxs);
  const validatingTxs = useUnit(basketPageModel.$validatingTxs);
  const validationWarningShown = useUnit(basketPageModel.$validationWarningShown);
  const txToRemove = useUnit(basketPageModel.$txToRemove);
  const alreadyValidatedTxs = useUnit(basketPageModel.$alreadyValidatedTxs);

  useEffect(() => {
    basketPageModel.events.validationStarted();
  }, [apis]);

  return (
    <section className="flex flex-col items-center relative h-full">
      <Header title={t('basket.title')} />

      {basketTxs.length > 0 && (
        <div className="overflow-y-auto w-full mt-4 h-full flex flex-col items-center">
          <div className="flex items-start justify-between w-[736px]">
            <Button variant="text" onClick={() => basketPageModel.events.allSelected()}>
              {t('basket.selectAll')}
            </Button>

            <div className="flex gap-4 items-center">
              <Button variant="text" onClick={() => basketPageModel.events.validationStarted()}>
                <div className="flex items-center gap-1">
                  <Icon className="text-icon-accent" name="refresh" />
                  {t('basket.refreshButton')}
                </div>
              </Button>
              <Button
                size="sm"
                className="w-[125px]"
                disabled={validatingTxs.length > 0 || selectedTxs.length === 0}
                onClick={() => basketPageModel.events.signStarted()}
              >
                {t(selectedTxs.length === 0 ? 'basket.emptySignButton' : 'basket.signButton')}
              </Button>
            </div>
          </div>

          <ul className="bg-block-background-default rounded-md flex divide-y flex-col gap-y-1.5 w-[736px]">
            {basketTxs.map((tx) => {
              const isInitialValidating = validatingTxs.includes(tx.id) && !alreadyValidatedTxs.includes(tx.id);
              const isValidating = validatingTxs.includes(tx.id) && alreadyValidatedTxs.includes(tx.id);

              return isInitialValidating ? (
                <Shimmering key={tx.id} width={736} height={52} className="flex gap-x-4 px-4" />
              ) : (
                <li key={tx.id} className="flex gap-x-4 px-4">
                  <div className="flex justify-center items-center">
                    <Checkbox
                      disabled={Boolean(invalidTxs.get(tx.id)) || isValidating}
                      checked={selectedTxs.includes(tx.id)}
                      onChange={() =>
                        basketPageModel.events.txSelected({ id: tx.id, value: !selectedTxs.includes(tx.id) })
                      }
                    />
                  </div>

                  <Operation
                    tx={tx}
                    validating={isValidating}
                    errorText={invalidTxs.get(tx.id)?.errorText}
                    onClick={() => basketPageModel.events.txClicked(tx)}
                    onTxRemoved={() => basketPageModel.events.removeTxStarted(tx)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {basketTxs.length === 0 && <EmptyBasket />}

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

      <ConfirmModal
        panelClass="w-[240px]"
        isOpen={Boolean(txToRemove)}
        confirmText={t('basket.removeConfirm.proceedButton')}
        confirmPallet="error"
        cancelText={t('basket.removeConfirm.cancelButton')}
        onClose={basketPageModel.events.removeTxCancelled}
        onConfirm={() => txToRemove && basketPageModel.events.txRemoved(txToRemove)}
      >
        <SmallTitleText align="center">{t('basket.removeConfirm.title')}</SmallTitleText>
        <FootnoteText className="mt-2 text-text-tertiary" align="center">
          {t('basket.removeConfirm.description')}
        </FootnoteText>
      </ConfirmModal>
    </section>
  );
};
