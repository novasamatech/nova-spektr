import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type Contact, type Wallet, WalletType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import {
  createAccountId,
  createVaultChainAccount,
  kusamaChainId,
  polkadotChain,
  polkadotChainId,
} from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';
import { type contactModel as ContactModule } from '@/entities/contact';
import { type walletModel as WalletModule } from '@/entities/wallet';

import { RECIPIENT_GROUP_IDS, useRecipientOptions } from './useRecipientOptions';

const walletId = 1;

const wallets: Wallet[] = [{ id: walletId, name: 'Vault', type: WalletType.POLKADOT_VAULT, accounts: [] }];

const polkadotKey = createVaultChainAccount('dot-key', {
  walletId,
  chainId: polkadotChainId,
  derivationPath: '//polkadot',
  name: 'Polkadot Key',
});
const kusamaKey = createVaultChainAccount('ksm-key', {
  walletId,
  chainId: kusamaChainId,
  derivationPath: '//kusama',
  name: 'Kusama Key',
});

const createContact = (id: string, name: string): Contact => {
  const accountId = createAccountId(id);

  return { id, name, accountId, address: toAddress(accountId, { prefix: 42 }), source: 'local' };
};

const aliceContact = createContact('alice', 'Alice');
const bobContact = createContact('bob', 'Bob');

const stubs = vi.hoisted(() => ({
  accounts: [] as AnyAccount[],
  wallets: [] as Wallet[],
  contacts: [] as Contact[],
}));

vi.mock('@/entities/contact', async (importOriginal) => {
  const { createStore } = await import('effector');
  const original = await importOriginal<{ contactModel: typeof ContactModule }>();

  return { ...original, contactModel: { ...original.contactModel, $contacts: createStore(stubs.contacts) } };
});

vi.mock('@/entities/wallet', async (importOriginal) => {
  const { createStore } = await import('effector');
  const original = await importOriginal<{ walletModel: typeof WalletModule }>();

  return {
    ...original,
    walletModel: {
      ...original.walletModel,
      $wallets: createStore(stubs.wallets),
      $availableAccounts: createStore(stubs.accounts),
    },
  };
});

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

// Names are resolved elsewhere — here the stored name is the displayed one.
vi.mock('@/domains/network', async (importOriginal) => ({
  ...(await importOriginal()),
  useAccountsNames: (accounts: AnyAccount[]) => accounts,
  useWalletsNames: (list: Wallet[]) => list,
}));

stubs.accounts.push(polkadotKey, kusamaKey);
stubs.wallets.push(...wallets);
stubs.contacts.push(aliceContact, bobContact);

const displayed = (accountId: Contact['accountId']) => toAddress(accountId, { prefix: polkadotChain.addressPrefix });

const renderOptions = (query: string) =>
  renderHook(() => useRecipientOptions({ chain: polkadotChain, query })).result.current;

const addressesOf = (groups: ReturnType<typeof renderOptions>) =>
  groups.map((group) => [group.id, group.items.map((item) => item.value.address)]);

describe('widgets/RecipientPicker/lib/useRecipientOptions', () => {
  it('should offer own accounts then contacts, with the typed address first when it is new', () => {
    const fresh = toAddress(createAccountId('fresh'), { prefix: polkadotChain.addressPrefix });

    expect(addressesOf(renderOptions(''))).toEqual([
      [WalletType.POLKADOT_VAULT, [displayed(polkadotKey.accountId), displayed(kusamaKey.accountId)]],
      [RECIPIENT_GROUP_IDS.CONTACTS, [displayed(aliceContact.accountId), displayed(bobContact.accountId)]],
    ]);

    // Nothing matches a fresh address, so the typed group stands alone.
    expect(addressesOf(renderOptions(fresh))).toEqual([[RECIPIENT_GROUP_IDS.TYPED_ADDRESS, [fresh]]]);
  });

  it('should not duplicate a typed address already listed as an own account', () => {
    const ownAddress = displayed(polkadotKey.accountId);

    expect(addressesOf(renderOptions(ownAddress))).toEqual([[WalletType.POLKADOT_VAULT, [ownAddress]]]);
  });

  it('should offer a fully typed contact address as the typed address — contacts hide on address queries', () => {
    const contactAddress = displayed(aliceContact.accountId);

    expect(addressesOf(renderOptions(contactAddress))).toEqual([[RECIPIENT_GROUP_IDS.TYPED_ADDRESS, [contactAddress]]]);
  });

  it('should find a contact by the chain-prefixed address the row displays', () => {
    const displayedAddress = displayed(bobContact.accountId);
    expect(displayedAddress).not.toBe(bobContact.address);

    expect(addressesOf(renderOptions(displayedAddress.slice(0, 10)))).toEqual([
      [RECIPIENT_GROUP_IDS.CONTACTS, [displayedAddress]],
    ]);
  });

  it('should hide the contacts group when the query is an address', () => {
    const groups = renderOptions(displayed(createAccountId('fresh')));

    expect(groups.some((group) => group.id === RECIPIENT_GROUP_IDS.CONTACTS)).toBe(false);
  });
});
