import { allSettled, fork } from 'effector';
import { vi } from 'vitest';

import { type BackendContact, type LocalContact } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
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
    },
  };
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

    const backendContact: BackendContact = {
      id: 'backend-1',
      name: 'External Name',
      address: toAddress(walletAccount.accountId),
      accountId: walletAccount.accountId,
      source: 'backend',
      entityNames: [],
      chainId: null,
      chainName: null,
      categoryName: null,
      contactTypeName: null,
      derivationPath: null,
      ownerAccountId: null,
      signatories: null,
      threshold: null,
      tags: [],
    };

    const scope = fork({
      values: [[contactModel.$contacts, [backendContact]]],
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
});
