import { attach, combine, createEffect, createEvent, restore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { AccountNameType, type Contact, type Wallet } from '@/shared/core';
import { createForm } from '@/shared/forms/createForm';
import { type ValidationError } from '@/shared/forms/types';
import { toAddress } from '@/shared/lib/utils';
import * as networkDomain from '@/domains/network';
import { accountService, accounts } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { walletModel, walletUtils } from '@/entities/wallet';

export type Callbacks = {
  onSubmit: () => void;
  onClose: () => void;
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

const syncContactsOnWalletRenameFx = attach({
  source: {
    contacts: contactModel.$contacts,
    accounts: accounts.$list,
  },
  mapParams: (wallet: Wallet, source) => ({
    wallet,
    existingContacts: source.contacts,
    allAccounts: source.accounts,
  }),
  effect: createEffect(
    async ({
      wallet,
      existingContacts,
      allAccounts,
    }: {
      wallet: Wallet;
      existingContacts: Contact[];
      allAccounts: networkDomain.AnyAccount[];
    }) => {
      const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
      if (walletAccounts.length === 0) return;

      const existingByAccountId = new Map(existingContacts.map((contact) => [contact.accountId, contact]));
      const toUpdate: Contact[] = [];
      const toCreate: Omit<Contact, 'id'>[] = [];

      for (const account of walletAccounts) {
        const accountId = account.accountId;
        if (!accountId) continue;

        const existingContact = existingByAccountId.get(accountId);

        if (existingContact) {
          if (existingContact.name !== wallet.name) {
            toUpdate.push({
              ...existingContact,
              name: wallet.name,
            });
          }

          continue;
        }

        toCreate.push({
          name: wallet.name,
          address: toAddress(accountId),
          accountId,
        });
      }

      if (toUpdate.length > 0) {
        await contactModel.effects.updateContactsFx(toUpdate);
      }

      if (toCreate.length > 0) {
        await contactModel.effects.createContactsFx(toCreate);
      }
    },
  ),
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
  filter: (walletToEdit: Wallet | null, { name }): boolean => {
    if (!walletToEdit) return false;
    return name.toLowerCase() !== walletToEdit.name.toLowerCase();
  },
  fn: (walletToEdit, { name }) => {
    const wallet = walletToEdit!;
    const accounts = walletUtils.isPolkadotVault(wallet)
      ? wallet.accounts
      : wallet.accounts?.map((acc) => ({ ...acc, name, nameType: AccountNameType.CUSTOM }));

    return { ...wallet, name, accounts };
  },
  target: renameWalletFx,
});

sample({
  clock: $walletForm.submit.doneData,
  source: $walletToEdit,
  filter: (walletToEdit: Wallet | null, { name }): boolean => {
    if (!walletToEdit) return false;
    return name.toLowerCase() === walletToEdit.name.toLowerCase();
  },
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onClose(),
  }),
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
  target: syncContactsOnWalletRenameFx,
});

sample({
  clock: syncContactsOnWalletRenameFx.done,
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
