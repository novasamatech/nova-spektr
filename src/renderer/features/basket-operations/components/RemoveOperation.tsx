import { type MouseEventHandler } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { ConfirmModal, FootnoteText, IconButton, SmallTitleText } from '@/shared/ui';
import { type BasketTransaction, basketOperations } from '@/aggregates/basket-operations';

type Props = {
  operation: BasketTransaction;
};

export const RemoveOperation = ({ operation }: Props) => {
  const { t } = useI18n();
  const [isOpen, toggleIsOpen] = useToggle(false);

  const handleTxRemoved: MouseEventHandler = event => {
    event.preventDefault();
    event.stopPropagation();
    toggleIsOpen();
  };

  const handleRemoveConfirmed = () => {
    basketOperations.removeTransactions([operation]);
    toggleIsOpen();
  };

  return (
    <>
      <IconButton name="delete" onClick={handleTxRemoved} />

      <ConfirmModal
        panelClass="w-[240px]"
        isOpen={isOpen}
        confirmText={t('basket.removeConfirm.proceedButton')}
        confirmPallet="error"
        cancelText={t('basket.removeConfirm.cancelButton')}
        onClose={toggleIsOpen}
        onConfirm={handleRemoveConfirmed}
      >
        <SmallTitleText align="center">{t('basket.removeConfirm.title')}</SmallTitleText>
        <FootnoteText className="mt-2 text-text-tertiary" align="center">
          {t('basket.removeConfirm.description')}
        </FootnoteText>
      </ConfirmModal>
    </>
  );
};
