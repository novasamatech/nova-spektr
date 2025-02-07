import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import { BasketFilter, basketFilterModel } from '@/features/basket-filter';
import { BasketOperations } from '@/features/basket-operations';

export const Basket = () => {
  const { t } = useI18n();

  const filteredTxs = useUnit(basketFilterModel.$filteredTxs);

  return (
    <section className="relative flex h-full flex-col items-center">
      <Header title={t('basket.title')} />

      <div className="mt-4">
        <BasketFilter />
      </div>

      <BasketOperations operations={filteredTxs} />
    </section>

    //   <ConfirmModal
    //     panelClass="w-[300px]"
    //     isOpen={validationWarningShown}
    //     confirmText={t('basket.validationWarning.proceedButton')}
    //     cancelText={t('basket.validationWarning.cancelButton')}
    //     onClose={basketPageModel.events.cancelValidationWarning}
    //     onConfirm={() => basketPageModel.events.proceedValidationWarning({ invalid: [], valid: validTxs })}
    //   >
    //     <SmallTitleText align="center">{t('basket.validationWarning.title')}</SmallTitleText>
    //     <FootnoteText className="mt-2 text-text-tertiary" align="center">
    //       {t('basket.validationWarning.description')}
    //     </FootnoteText>
    //   </ConfirmModal>

    //   <ConfirmModal
    //     panelClass="w-[240px]"
    //     isOpen={Boolean(txToRemove)}
    //     confirmText={t('basket.removeConfirm.proceedButton')}
    //     confirmPallet="error"
    //     cancelText={t('basket.removeConfirm.cancelButton')}
    //     onClose={basketPageModel.events.removeTxCancelled}
    //     onConfirm={() => txToRemove && basketPageModel.events.txRemoved(txToRemove)}
    //   >
    //     <SmallTitleText align="center">{t('basket.removeConfirm.title')}</SmallTitleText>
    //     <FootnoteText className="mt-2 text-text-tertiary" align="center">
    //       {t('basket.removeConfirm.description')}
    //     </FootnoteText>
    //   </ConfirmModal>
    // </section>
  );
};
