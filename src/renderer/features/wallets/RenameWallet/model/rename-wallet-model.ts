import { attach, combine, createApi, createEffect, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { not } from 'patronum';

import { Wallet } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { storageService } from '@shared/api/storage';
import { splice } from '@shared/lib/utils';

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $walletToEdit = createStore<Wallet | null>(null);
const walletApi = createApi($walletToEdit, {
  formInitiated: (state, props: Wallet) => ({ ...state, ...props }),
});

const $walletForm = createForm({
  fields: {
    name: {
      init: '',
      rules: [
        { name: 'required', errorText: 'walletDetails.common.nameRequiredError', validator: Boolean },
        {
          name: 'exist',
          errorText: 'walletDetails.common.nameExistsError',
          source: combine({
            walletToEdit: $walletToEdit,
            wallets: walletModel.$wallets,
          }),
          validator: validateNameExist,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const renameWalletFx = createEffect(async ({ id, ...rest }: Wallet): Promise<Wallet> => {
  await storageService.wallets.update(id, rest);

  return { id, ...rest };
});

sample({
  clock: walletApi.formInitiated,
  filter: $walletForm.$isDirty,
  target: $walletForm.reset,
});

sample({
  clock: walletApi.formInitiated,
  filter: not($walletForm.$isDirty),
  fn: ({ name }) => ({ name }),
  target: $walletForm.setForm,
});

type SourceParams = {
  walletToEdit: Wallet;
  wallets: Wallet[];
};
function validateNameExist(value: string, _: unknown, params: SourceParams): boolean {
  if (!value) return true;

  const isSameName = value.toLowerCase() === params.walletToEdit.name.toLowerCase();
  const isUnique = params.wallets.every((wallet) => wallet.name.toLowerCase() !== value.toLowerCase());

  return isSameName || isUnique;
}

sample({
  clock: $walletForm.formValidated,
  source: $walletToEdit,
  filter: (walletToEdit) => walletToEdit !== null,
  fn: (walletToEdit, form) => ({ ...walletToEdit!, name: form.name }),
  target: renameWalletFx,
});

sample({
  clock: renameWalletFx.doneData,
  source: walletModel.$wallets,
  fn: (wallets, updatedWallet) => {
    const updatedWalletIndex = wallets.findIndex((w) => w.id === updatedWallet.id);

    return splice(wallets, updatedWallet, updatedWalletIndex);
  },
  target: walletModel.$wallets,
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
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    formInitiated: walletApi.formInitiated,
  },
};
