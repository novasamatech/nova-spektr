import { type FormEvent, type PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useForm } from '@/shared/forms/useForm';
import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, InputHint } from '@/shared/ui';
import { Input, Modal, useNotification } from '@/shared/ui-kit';
import { useWalletName } from '@/domains/network';
import { renameWalletModel } from '../model/rename-wallet-model';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
}>;

export const RenameWalletModal = ({ wallet, onClose, children }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();

  const [isOpen, setIsOpen] = useState(false);

  const {
    submit,
    fields: { name },
  } = useForm(renameWalletModel.$walletForm);

  const resolvedWalletName = useWalletName(wallet);

  const displayValue = useMemo(() => {
    const isEdited = name.value !== wallet.name;

    if (isEdited) {
      return name.value;
    }

    return resolvedWalletName ?? name.value ?? '';
  }, [name.value, resolvedWalletName, wallet.name]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleSubmitSuccess = () => {
    toast.success(t('walletDetails.common.renameWalletSuccessTitle'), {
      description: t('walletDetails.common.renameWalletSuccessDescription'),
    });
    handleClose();
  };

  const onToggle = (isOpen: boolean) => {
    if (isOpen) {
      setIsOpen(true);
      return;
    }
    handleClose();
  };

  useEffect(() => {
    if (isOpen) {
      renameWalletModel.formInitiated(wallet);
    }
  }, [isOpen]);

  useEffect(() => {
    renameWalletModel.callbackChanged({
      onSubmit: handleSubmitSuccess,
      onClose: handleClose,
    });
  }, [handleSubmitSuccess, handleClose]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <Modal size="md" height="fit" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('walletDetails.common.renameWallet')}</Modal.Title>
      <Modal.Content>
        <form className="flex flex-col gap-4 p-4" onSubmit={submitForm}>
          <div className="flex flex-col gap-2">
            <Input
              autoFocus
              name="name"
              width="full"
              height="sm"
              placeholder={t('walletDetails.common.renameWallet')}
              invalid={name.hasError}
              value={displayValue}
              onChange={name.onChange}
            />
            <InputHint variant="error" active={name.hasError}>
              {t(name.errorMessage)}
            </InputHint>
            <FootnoteText className="text-text-tertiary">{t('walletDetails.common.renameWalletWarning')}</FootnoteText>
          </div>

          <Button className="ml-auto" size="sm" type="submit" disabled={displayValue.trim() === ''}>
            {t('walletDetails.common.renameSaveButton')}
          </Button>
        </form>
      </Modal.Content>
    </Modal>
  );
};
