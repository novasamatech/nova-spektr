import { attach, combine, createEffect, createEvent, restore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type Wallet } from '@/shared/core';
import { createForm } from '@/shared/forms/createForm';
import { type ValidationError } from '@/shared/forms/types';
import { nonNullable } from '@/shared/lib/utils';
import * as networkDomain from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';

export type Callbacks = {
  onSubmit: () => void;
};

const callbackChanged = createEvent<Callbacks>();
const $callbacks = restore(callbackChanged, null);

const formInitiated = createEvent<Wallet>();
const $walletToEdit = restore(formInitiated, null);

type SourceParams = {
  walletToEdit: Wallet;
  wallets: Wallet[];
};

const $walletForm = createForm<{ name: string }>({
  fields: {
    name: {
      defaultValue: '',
      validator: () => ({
        source: combine({
          walletToEdit: $walletToEdit,
          wallets: walletModel.$wallets,
        }),
        fn: (value: string, _: unknown, params: SourceParams): ValidationError[] => {
          const errors: ValidationError[] = [];

          if (!value) {
            errors.push({ message: 'walletDetails.common.nameRequiredError' });
            return errors;
          }

          const isSameName = value.toLowerCase() === params.walletToEdit.name.toLowerCase();
          const isUnique = params.wallets.every((wallet) => wallet.name.toLowerCase() !== value.toLowerCase());

          if (!isSameName && !isUnique) {
            errors.push({ message: 'walletDetails.common.nameExistsError' });
          }

          return errors;
        },
      }),
    },
  },
  validateOn: ['submit'],
});

const renameWalletFx = createEffect(async ({ id, accounts, ...rest }: Wallet): Promise<Wallet> => {
  await storageService.wallets.update(id, rest);
  await networkDomain.accounts.updateAccounts(accounts);

  return { id, accounts, ...rest };
});

sample({
  clock: formInitiated,
  target: $walletForm.reset,
});

sample({
  clock: formInitiated,
  fn: ({ name }) => name,
  target: $walletForm.fields.name.change,
});

sample({
  clock: $walletForm.submit.doneData,
  source: $walletToEdit,
  filter: (walletToEdit: Wallet | null): walletToEdit is Wallet => nonNullable(walletToEdit),
  fn: (walletToEdit, { name }) => {
    const accounts = walletUtils.isPolkadotVault(walletToEdit)
      ? walletToEdit.accounts
      : walletToEdit.accounts?.map((acc) => ({ ...acc, name }));

    return { ...walletToEdit, name, accounts };
  },
  target: renameWalletFx,
});

sample({
  clock: renameWalletFx.doneData,
  fn: (updatedWallet) => ({
    walletId: updatedWallet.id,
    data: updatedWallet,
  }),
  target: walletModel.events.updateWallet,
});

sample({
  clock: renameWalletFx.doneData,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
  }),
});

export const renameWalletModel = {
  $walletForm,
  $walletToEdit,

  callbackChanged,
  formInitiated,
};
