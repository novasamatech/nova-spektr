import { CryptoType, SigningType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, polkadotChainId } from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';
import { searchSignatoryAccounts } from '../searchSignatoryAccounts';

const createAccount = (id: string, walletId: number, name: string): AnyAccount => ({
  id,
  walletId,
  name,
  type: 'chain',
  chainId: polkadotChainId,
  accountId: createAccountId(`account ${id}`),
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: Date.now(),
});

// Raw account names (stored key names) differ from resolved names shown in UI
const vaultAccount = createAccount('1', 1, 'FINOPS_PTL_JUL26_SCHEFFLER');
const otherAccount = createAccount('2', 2, 'Some other account');

const accounts = [vaultAccount, otherAccount];

// Resolved names — what the dropdown actually displays
const resolvedAccounts = [
  { accountId: vaultAccount.accountId, name: 'FINOPS_DOT_PTL_JUL26_SCHEFFLER' },
  { accountId: otherAccount.accountId, name: 'Some other account' },
];

const resolvedWallets = [
  { id: 1, name: 'PTL Keys' },
  { id: 2, name: 'Other Wallet' },
];

const search = (query: string, addressPrefix = 0) => {
  return searchSignatoryAccounts({ accounts, query, resolvedAccounts, resolvedWallets, addressPrefix });
};

describe('multisig-wallet-create/common/searchSignatoryAccounts', () => {
  test('should return all accounts for empty query', () => {
    expect(search('')).toEqual(accounts);
  });

  test('should find account by resolved (displayed) name when it differs from raw name', () => {
    // raw name is "FINOPS_PTL_JUL26_SCHEFFLER", displayed name is "FINOPS_DOT_PTL_JUL26_SCHEFFLER"
    expect(search('FINOPS_D')).toEqual([vaultAccount]);
  });

  test('should find the only matching account when full displayed name is pasted', () => {
    expect(search('FINOPS_DOT_PTL_JUL26_SCHEFFLER')).toEqual([vaultAccount]);
  });

  test('should find account by displayed wallet name', () => {
    expect(search('PTL Keys')).toEqual([vaultAccount]);
  });

  test('should find account by displayed address', () => {
    const address = toAddress(vaultAccount.accountId, { prefix: 0 });

    expect(search(address.slice(0, 12))).toEqual([vaultAccount]);
  });

  test('should be case insensitive', () => {
    expect(search('finops_dot')).toEqual([vaultAccount]);
  });

  test('should return nothing when query matches neither names nor address', () => {
    expect(search('MISSING_QUERY')).toEqual([]);
  });

  test('should fall back to raw account name when there is no resolved name', () => {
    const found = searchSignatoryAccounts({
      accounts,
      query: 'FINOPS_PTL',
      resolvedAccounts: [],
      resolvedWallets: [],
      addressPrefix: 0,
    });

    expect(found).toEqual([vaultAccount]);
  });
});
