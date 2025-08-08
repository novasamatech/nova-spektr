import { type FormEvent, type PropsWithChildren, useEffect, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useForm } from '@/shared/forms/useForm';
import { useI18n } from '@/shared/i18n';
import { Button, InputHint } from '@/shared/ui';
import { Input, Modal } from '@/shared/ui-kit';
import { renameWalletModel } from '../model/rename-wallet-model';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
}>;

export const RenameWalletModal = ({ wallet, onClose, children }: Props) => {
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState(false);

  const {
    submit,
    fields: { name },
  } = useForm(renameWalletModel.$walletForm);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
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
  }, [wallet, isOpen]);

  useEffect(() => {
    renameWalletModel.callbackChanged({ onSubmit: handleClose });
  }, [handleClose]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <Modal size="sm" height="fit" isOpen={isOpen} onToggle={onToggle}>
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
              value={name.value}
              onChange={name.onChange}
            />
            <InputHint variant="error" active={name.hasError}>
              {t(name.errorMessage)}
            </InputHint>
          </div>

          <Button className="ml-auto" size="sm" type="submit" disabled={name.value.trim() === ''}>
            {t('walletDetails.common.renameSaveButton')}
          </Button>
        </form>
      </Modal.Content>
    </Modal>
  );
};
