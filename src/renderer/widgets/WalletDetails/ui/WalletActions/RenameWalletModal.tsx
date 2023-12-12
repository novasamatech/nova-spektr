import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { FormEvent, useEffect } from 'react';

import { Wallet } from '@shared/core';
import { BaseModal, Button, Input, InputHint } from '@shared/ui';
import { useI18n } from '@app/providers';
import { renameWalletModel } from '../../model/rename-wallet-model';

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

  const pending = useUnit(renameWalletModel.$submitPending);

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
      <form className="flex flex-col pt-4 gap-4" onSubmit={submitForm}>
        <div className="flex flex-col gap-2">
          <Input
            name="name"
            className="w-full"
            wrapperClass="h-[42px]"
            label={t('walletDetails.common.renameLabel')}
            invalid={name?.hasError()}
            value={name?.value}
            onChange={name?.onChange}
          />
          <InputHint variant="error" active={name?.hasError()}>
            {t(name?.errorText())}
          </InputHint>
        </div>

        <Button className="ml-auto" type="submit" disabled={!isValid || pending} isLoading={pending}>
          {t('walletDetails.common.renameSaveButton')}
        </Button>
      </form>
    </BaseModal>
  );
};
