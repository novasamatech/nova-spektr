import { useForm } from 'effector-forms';
import { type FormEvent, useEffect } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BaseModal, Button, InputHint } from '@/shared/ui';
import { Field, Input } from '@/shared/ui-kit';
import { renameWalletModel } from '../model/rename-wallet-model';

type Props = {
  wallet: Wallet;
  isOpen: boolean;
  onClose: () => void;
};

export const RenameWalletModal = ({ wallet, isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const {
    submit,
    isValid,
    fields: { name },
  } = useForm(renameWalletModel.$walletForm);

  useEffect(() => {
    renameWalletModel.events.formInitiated(wallet);
  }, [wallet]);

  useEffect(() => {
    renameWalletModel.events.callbacksChanged({ onSubmit: onClose });
  }, [onClose]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <BaseModal isOpen={isOpen} closeButton title={t('walletDetails.common.renameTitle')} onClose={onClose}>
      <form className="flex flex-col gap-4 pt-4" onSubmit={submitForm}>
        <Field text={t('walletDetails.common.renameLabel')}>
          <Input name="name" invalid={name?.hasError()} value={name?.value} onChange={name?.onChange} />
          <InputHint variant="error" active={name?.hasError()}>
            {t(name.errorText())}
          </InputHint>
        </Field>

        <Button className="ml-auto" type="submit" disabled={!isValid}>
          {t('walletDetails.common.renameSaveButton')}
        </Button>
      </form>
    </BaseModal>
  );
};
