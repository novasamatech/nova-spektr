import { act, renderHook } from '@testing-library/react';
import { createEvent } from 'effector';

import { type Wallet, AccountNameType } from '@/shared/core';
import { useAccountsNames, useWalletsNames } from '../hooks';
import { accounts } from '../store';
import { type AnyAccount } from '../types';
// Imported after the resource on purpose, the way the app loads them.
// eslint-disable-next-line import-x/order
import { contactModel } from '@/entities/contact';

import { createMultisigAccount, createMultisigWallet, multisigContact } from './name-freshness.fixtures';

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

const withAccounts = (wallet: Wallet, list: AnyAccount[]): Wallet => ({
  ...wallet,
  accounts: list.filter((a) => a.walletId === wallet.id) as Wallet['accounts'],
});

// The hooks start their requests unscoped (as in the app), so these tests
// drive the global stores instead of a fork.
const accountsSet = createEvent<AnyAccount[]>();
accounts.__test.$list.on(accountsSet, (_, list) => list);

describe('name hooks follow changed snapshots', () => {
  beforeEach(() => {
    contactModel.events.backendContactsCleared();
    accountsSet([]);
  });

  it('should keep the address book name when a wallet changes but the wallet set does not', async () => {
    const account = createMultisigAccount(1);
    const wallet = withAccounts(createMultisigWallet(1), [account]);
    accountsSet([account]);
    contactModel.events.backendContactsReceived([multisigContact]);

    const { result, rerender } = renderHook(({ wallets }) => useWalletsNames(wallets), {
      initialProps: { wallets: [wallet] },
    });
    await act(flush);
    expect(result.current[0]?.name).toBe('FINOPS_DOT_MSIG');

    rerender({ wallets: [{ ...wallet, name: 'stored-name-changed' }] });
    await act(flush);

    expect(result.current[0]?.name).toBe('FINOPS_DOT_MSIG');
  });

  it('should show the new name after an account is renamed', async () => {
    const account: AnyAccount = { ...createMultisigAccount(2), name: 'Old name', nameType: AccountNameType.CUSTOM };
    accountsSet([account]);

    const { result, rerender } = renderHook(({ list }) => useAccountsNames(list), {
      initialProps: { list: [account] },
    });
    await act(flush);
    expect(result.current[0]?.name).toBe('Old name');

    const renamed = { ...account, name: 'New name' };
    act(() => {
      accountsSet([renamed]);
    });
    rerender({ list: [renamed] });
    await act(flush);

    expect(result.current[0]?.name).toBe('New name');
  });
});
