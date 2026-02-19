import { attach, combine, createEffect, createEvent, restore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type Contact, type Wallet, AccountNameType } from '@/shared/core';
import { createForm } from '@/shared/forms/createForm';
import { type ValidationError } from '@/shared/forms/types';
import { toAddress } from '@/shared/lib/utils';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
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

const renameWalletFx = createEffect(async ({ id, accounts: walletAccounts, ...rest }: Wallet): Promise<Wallet> => {
  await storageService.wallets.update(id, rest);
  await accounts.updateAccounts(walletAccounts);

  return { id, accounts: walletAccounts, ...rest };
});

const syncContactsOnWalletRenameFx = createEffect(
  async ({
    wallet,
    existingContacts,
    allAccounts,
  }: {
    wallet: Wallet;
    existingContacts: Contact[];
    allAccounts: AnyAccount[];
  }) => {
    const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
    if (walletAccounts.length === 0) return;

    const mainAccountId = accountService.getWalletAccountId(wallet, allAccounts);

    if (!mainAccountId) return;

    const existingContact = existingContacts.find((contact) => contact.accountId === mainAccountId);

    if (existingContact) {
      if (existingContact.name !== wallet.name) {
        await contactModel.effects.updateContactsFx([
          {
            ...existingContact,
            name: wallet.name,
          },
        ]);
      }
    } else {
      await contactModel.effects.createContactsFx([
        {
          name: wallet.name,
          address: toAddress(mainAccountId),
          accountId: mainAccountId,
          source: 'local',
          entityName: null,
          chainId: null,
          chainName: null,
          categoryName: null,
          contactTypeName: null,
          derivationPath: null,
          ownerPublicKey: null,
        },
      ]);
    }
  },
);

const syncContactsOnWalletRenameAttachedFx = attach({
  source: {
    contacts: contactModel.$contacts,
    accounts: accounts.$list,
  },
  mapParams: (wallet: Wallet, source) => ({
    wallet,
    existingContacts: source.contacts,
    allAccounts: source.accounts,
  }),
  effect: syncContactsOnWalletRenameFx,
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

const $renamedWallet = restore(renameWalletFx.doneData, null);

sample({
  clock: renameWalletFx.doneData,
  target: syncContactsOnWalletRenameAttachedFx,
});

sample({
  clock: syncContactsOnWalletRenameAttachedFx.done,
  source: $renamedWallet,
  filter: Boolean,
  fn: (wallet) => {
    return {
      walletId: wallet.id,
      data: wallet,
    };
  },
  target: walletModel.events.updateWallet,
});

sample({
  clock: syncContactsOnWalletRenameAttachedFx.done,
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
