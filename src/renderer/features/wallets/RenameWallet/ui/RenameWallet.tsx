import { type FormEvent, useEffect, useRef } from 'react';

import { type Wallet } from '@/shared/core';
import { useForm } from '@/shared/forms/useForm';
import { useI18n } from '@/shared/i18n';
import { useClickOutside } from '@/shared/lib/hooks';
import { FootnoteText, IconButton } from '@/shared/ui';
import { Input } from '@/shared/ui-kit';
import { renameWalletModel } from '../model/rename-wallet-model';

type Props = {
  wallet: Wallet;
  isOpen: boolean;
  onClose: () => void;
};

export const RenameWallet = ({ wallet, isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const {
    submit,
    fields: { name },
  } = useForm(renameWalletModel.$walletForm);

  const formRef = useRef<HTMLFormElement>(null);

  useClickOutside([formRef], onClose);

  useEffect(() => {
    if (isOpen) {
      renameWalletModel.formInitiated(wallet);
    }
  }, [isOpen]);

  useEffect(() => {
    renameWalletModel.callbackChanged({
      onSubmit: onClose,
      onClose: onClose,
    });
  }, [onClose]);

  if (!isOpen) return null;

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="ml-4 w-full">
      <form className="flex flex-1 items-center gap-4" ref={formRef} onSubmit={submitForm}>
        <Input
          autoFocus
          width="full"
          height="md"
          textSize="lg"
          name="name"
          placeholder={t('walletDetails.common.renameWallet')}
          invalid={name.hasError}
          value={name.value}
          onChange={name.onChange}
        />
        <IconButton name="checkmark" disabled={name.value.trim() === ''} onClick={submitForm} />
      </form>
      <FootnoteText className="mt-2 text-text-tertiary">{t('walletDetails.common.renameWalletWarning')}</FootnoteText>
    </div>
  );
};
