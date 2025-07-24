import { type FormEvent, useEffect, useRef } from 'react';

import { type Wallet } from '@/shared/core';
import { useForm } from '@/shared/forms/useForm';
import { useClickOutside } from '@/shared/lib/hooks';
import { IconButton } from '@/shared/ui';
import { Input } from '@/shared/ui-kit';
import { renameWalletModel } from '../model/rename-wallet-model';

type Props = {
  wallet: Wallet;
  isOpen: boolean;
  onClose: () => void;
};

export const RenameWallet = ({ wallet, isOpen, onClose }: Props) => {
  const {
    submit,
    fields: { name },
  } = useForm(renameWalletModel.$walletForm);

  const formRef = useRef<HTMLFormElement>(null);

  useClickOutside([formRef], onClose);

  useEffect(() => {
    renameWalletModel.events.formInitiated(wallet);
  }, [wallet]);

  useEffect(() => {
    renameWalletModel.events.callbacksChanged({ onSubmit: onClose });
  }, [onClose]);

  if (!isOpen) return null;

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <form ref={formRef} className="flex flex-1 items-center gap-4" onSubmit={submitForm}>
      <Input
        autoFocus
        width="full"
        height="md"
        textSize="lg"
        name="name"
        invalid={name.hasError}
        value={name.value}
        onChange={name.onChange}
      />

      <IconButton name="checkmark" disabled={name.hasError || name.value.trim() === ''} onClick={submitForm} />
    </form>
  );
};
