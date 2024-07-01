import { useEffect } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Button, Checkbox, ConfirmModal, FootnoteText, Header, Icon, SmallTitleText } from '@shared/ui';
import { Operation } from './Operation';
import { basketPageModel } from '../model/basket-page-model';
import { EmptyBasket } from './EmptyBasket';
import { SignOperation } from './SignOperation';
import { SignOperations } from './SignOperations';
import { networkModel } from '@entities/network';

export const Basket = () => {
  const { t } = useI18n();

  const basketTxs = useUnit(basketPageModel.$basketTransactions);
  const apis = useUnit(networkModel.$apis);
  const selectedTxs = useUnit(basketPageModel.$selectedTxs);
  const invalidTxs = useUnit(basketPageModel.$invalidTxs);
  const validTxs = useUnit(basketPageModel.$validTxs);
  const validatingTxs = useUnit(basketPageModel.$validatingTxs);
  const alreadyValidatedTxs = useUnit(basketPageModel.$alreadyValidatedTxs);
  const validationWarningShown = useUnit(basketPageModel.$validationWarningShown);
  const txToRemove = useUnit(basketPageModel.$txToRemove);

  const isSignAvailable = validatingTxs.filter((tx) => selectedTxs.includes(tx)).length > 0 || selectedTxs.length === 0;

  useEffect(() => {
    basketPageModel.events.validationStarted();
  }, [apis]);

  return (
    <section className="flex flex-col items-center relative h-full">
      <Header title={t('basket.title')} />

      {basketTxs.length > 0 && (
        <div className="overflow-y-auto w-full mt-4 gap-4 h-full flex flex-col items-center">
          <div className="flex items-center justify-between w-[736px]">
            <Checkbox
              className="ml-3"
              checked={basketTxs.length === selectedTxs.length}
              semiChecked={selectedTxs.length > 0 && basketTxs.length !== selectedTxs.length}
              onChange={() => basketPageModel.events.allSelected()}
            >
              <FootnoteText className="text-text-secondary">
                {t('basket.selectedStatus', { count: basketTxs.length, selected: selectedTxs.length })}
              </FootnoteText>
            </Checkbox>

            <div className="flex gap-4 items-center">
              <Button variant="text" size="sm" onClick={() => basketPageModel.events.refreshValidationStarted()}>
                <div className="flex items-center gap-1">
                  <Icon className="text-icon-accent" name="refresh" />
                  {t('basket.refreshButton')}
                </div>
              </Button>
              <Button
                size="sm"
                className="w-[125px]"
                disabled={isSignAvailable}
                onClick={() => basketPageModel.events.signStarted()}
              >
                {t(selectedTxs.length === 0 ? 'basket.emptySignButton' : 'basket.signButton')}
              </Button>
            </div>
          </div>

          <ul className="rounded-md flex divide-y flex-col gap-y-1.5 w-[736px]">
            {basketTxs.map((tx) => (
              <li key={tx.id} className="flex gap-x-4 px-3 bg-block-background-default">
                <div className="flex justify-center items-center">
                  <Checkbox
                    disabled={
                      Boolean(invalidTxs.get(tx.id)) ||
                      validatingTxs.includes(tx.id) ||
                      !alreadyValidatedTxs.includes(tx.id)
                    }
                    checked={selectedTxs.includes(tx.id)}
                    onChange={() =>
                      basketPageModel.events.txSelected({ id: tx.id, value: !selectedTxs.includes(tx.id) })
                    }
                  />
                </div>

                <Operation
                  tx={tx}
                  validating={validatingTxs.includes(tx.id) || !alreadyValidatedTxs.includes(tx.id)}
                  errorText={invalidTxs.get(tx.id)?.errorText}
                  onClick={() => basketPageModel.events.txClicked(tx)}
                  onTxRemoved={() => basketPageModel.events.removeTxStarted(tx)}
                />
              </li>
            ))}
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
