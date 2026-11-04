import { allSettled, fork, launch } from 'effector';
import { vi } from 'vitest';

import { type BackendContact, type LocalContact } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';
import { renameWalletModel } from '../rename-wallet-model';

import { walletMock } from './mocks/wallet-mock';

vi.mock('@walletconnect/utils', () => ({
  getSdkError: jest.fn(),
}));

vi.mock('@walletconnect/sign-client', () => ({
  Client: {},
}));

const { updateAccountsMock } = vi.hoisted(() => ({ updateAccountsMock: vi.fn().mockResolvedValue(true) }));

vi.mock('@/shared/api/storage', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@/shared/api/storage')>();

  return {
    ...actual,
    storageService: {
      contacts: {
        insertAll: vi.fn().mockResolvedValue(undefined),
        updateAll: vi.fn().mockResolvedValue(undefined),
      },
      wallets: {
        update: vi.fn().mockResolvedValue(undefined),
      },
      accounts2: {
        updateAll: updateAccountsMock,
      },
    },
  };
});

const createBackendContact = (accountId: AccountId, name: string): BackendContact => ({
  id: 'backend-1',
  name,
  address: toAddress(accountId),
  accountId,
  source: 'backend',
  chainId: null,
  chainName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories: null,
  threshold: null,
  fields: [],
});

describe('features/wallets/RenameWallet/model/rename-wallet-model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should validate non-unique wallet name', async () => {
    const wallets = [walletMock.wallet1, walletMock.wallet2];
    const scope = fork({
      values: new Map().set(walletModel.__test.$rawWallets, wallets),
    });

    await allSettled(renameWalletModel.formInitiated, { scope, params: walletMock.wallet1 });
    await allSettled(renameWalletModel.$walletForm.fields.name.change, { scope, params: walletMock.wallet2.name });
    await allSettled(renameWalletModel.$walletForm.validate, { scope });

    expect(scope.getState(renameWalletModel.$walletForm.$isValid)).toEqual(false);
  });

  test('should not modify backend contacts when renaming wallet', async () => {
    const wallet = walletMock.wallet1;
    const walletAccount = wallet.accounts[0]!;

    const backendContact = createBackendContact(walletAccount.accountId, 'External Name');

    const scope = fork({
      values: [[contactModel.$backendContacts, [backendContact]]],
    });

    // Directly call the sync effect with only local contacts (empty, since we only have backend)
    // This simulates what happens after the source store change from $contacts to $localContacts
    await allSettled(renameWalletModel.__test.syncContactsOnWalletRenameFx, {
      scope,
      params: {
        wallet: { ...wallet, name: 'New Wallet Name' },
        existingContacts: [] as LocalContact[], // No local contacts — simulates $localContacts filtering
        allAccounts: wallet.accounts,
      },
    });

    const contacts = scope.getState(contactModel.$contacts);
    const backendContacts = contacts.filter((c) => c.source === 'backend');
    const localContacts = contacts.filter((c) => c.source === 'local');

    // Backend contact must remain unchanged
    expect(backendContacts).toHaveLength(1);
    expect(backendContacts[0]!.name).toBe('External Name');

    // A new local contact should be created instead of modifying the backend one
    expect(localContacts).toHaveLength(1);
    expect(localContacts[0]!.name).toBe('New Wallet Name');
  });

  test('should store the typed name sanitized and leave the backend contact untouched', async () => {
    const wallet = walletMock.wallet1;
    const walletAccount = wallet.accounts[0]!;
    const backendContact = createBackendContact(walletAccount.accountId, 'External Name');
    const localContact: LocalContact = {
      id: 'local-1',
      name: 'Old local name',
      address: toAddress(walletAccount.accountId),
      accountId: walletAccount.accountId,
      source: 'local',
    };

    const scope = fork({
      values: [
        [walletModel.__test.$rawWallets, [wallet, walletMock.wallet2]],
        [accounts.__test.$list, wallet.accounts],
        [contactModel.$localContacts, [localContact]],
        [contactModel.$backendContacts, [backendContact]],
      ],
    });

    await allSettled(renameWalletModel.formInitiated, { scope, params: wallet });
    // Form validators read their sources outside the fork, so the submit result is launched directly.
    launch({
      target: renameWalletModel.$walletForm.submit.doneData,
      params: { name: '‮ Renamed​ wallet \n' },
      scope,
    });
    await allSettled(scope);

    const renamedWallet = scope.getState(walletModel.$wallets).find((w) => w.id === wallet.id);
    expect(renamedWallet?.name).toBe('Renamed wallet');
    expect(updateAccountsMock).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: walletAccount.accountId, name: 'Renamed wallet' }),
    ]);

    const contacts = scope.getState(contactModel.$contacts);
    expect(contacts.filter((c) => c.source === 'backend')).toEqual([backendContact]);
    expect(contacts.filter((c) => c.source === 'local')).toEqual([{ ...localContact, name: 'Renamed wallet' }]);
  });

  test('should reject a name that is empty after sanitization', () => {
    const params = { walletToEdit: walletMock.wallet1, wallets: [walletMock.wallet1] };

    expect(renameWalletModel.__test.validateWalletName('​‌﻿', params)).toEqual([
      { message: 'walletDetails.common.nameRequiredError' },
    ]);
    expect(renameWalletModel.__test.validateWalletName('​Alice', params)).toEqual([]);
  });
});
