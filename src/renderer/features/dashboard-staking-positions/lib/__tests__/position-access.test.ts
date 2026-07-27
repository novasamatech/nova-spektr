import { describe, expect, it } from 'vitest';

import { type ChainId, type Wallet, AccountType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { getAccessMode, getMultisigThreshold } from '../position-access';

const accountId = (index: number): AccountId => toAccountId(`0x${index.toString(16).padStart(64, '0')}`);

const ALICE = accountId(1);
const BOB = accountId(2);
const CAROL = accountId(3);
const MULTISIG = accountId(4);
const PROXIED = accountId(5);
const CHAIN: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

/**
 * `Wallet.accounts` is typed as `AnyAccount & Record<string, any>`, which is
 * the escape hatch the app itself uses for the `accountType`-carrying subtypes.
 * Building fixtures through it keeps the tests free of casts.
 */
type AccountFixture = Wallet['accounts'][number];

function baseAccount(overrides: Record<string, unknown> = {}): AccountFixture {
  return {
    id: 'account',
    type: 'universal',
    name: 'Account',
    walletId: 1,
    accountId: ALICE,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
    accountType: AccountType.BASE,
    ...overrides,
  };
}

function chainAccount(overrides: Record<string, unknown> = {}): AccountFixture {
  return {
    id: 'chain-account',
    type: 'chain',
    name: 'Account',
    walletId: 1,
    chainId: CHAIN,
    accountId: ALICE,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
    accountType: AccountType.CHAIN,
    ...overrides,
  };
}

function multisigAccount(overrides: Record<string, unknown> = {}): AccountFixture {
  return baseAccount({
    id: 'multisig',
    accountId: MULTISIG,
    accountType: AccountType.MULTISIG,
    signingType: SigningType.MULTISIG,
    threshold: 2,
    signatories: [{ accountId: BOB }, { accountId: CAROL }],
    ...overrides,
  });
}

function makeWallet(id: number, type: WalletType, accounts: AccountFixture[]): Wallet {
  return { id, name: `Wallet ${id}`, type, accounts };
}

describe('getAccessMode', () => {
  it('reports a signable local account as direct', () => {
    const account = baseAccount();
    const wallets = [makeWallet(1, WalletType.POLKADOT_VAULT, [account])];

    expect(getAccessMode(account, wallets)).toEqual('direct');
  });

  it('reports a watch-only wallet as watchOnly', () => {
    const account = baseAccount({
      accountType: AccountType.WATCH_ONLY,
      signingType: SigningType.WATCH_ONLY,
    });
    const wallets = [makeWallet(1, WalletType.WATCH_ONLY, [account])];

    expect(getAccessMode(account, wallets)).toEqual('watchOnly');
  });

  it('reports a multisig with a local signatory as multisig', () => {
    const signatory = baseAccount({ id: 'signer', walletId: 2, accountId: BOB });
    const multisig = multisigAccount();

    const wallets = [
      makeWallet(1, WalletType.MULTISIG, [multisig]),
      makeWallet(2, WalletType.POLKADOT_VAULT, [signatory]),
    ];

    expect(getAccessMode(multisig, wallets)).toEqual('multisig');
  });

  it('reports a multisig without a local signatory as draft', () => {
    const multisig = multisigAccount();
    const wallets = [makeWallet(1, WalletType.MULTISIG, [multisig])];

    expect(getAccessMode(multisig, wallets)).toEqual('draft');
  });

  it('does not count a watch-only key as a signatory', () => {
    const watched = baseAccount({
      id: 'watched',
      walletId: 2,
      accountId: BOB,
      accountType: AccountType.WATCH_ONLY,
      signingType: SigningType.WATCH_ONLY,
    });
    const multisig = multisigAccount({ threshold: 1, signatories: [{ accountId: BOB }] });

    const wallets = [makeWallet(1, WalletType.MULTISIG, [multisig]), makeWallet(2, WalletType.WATCH_ONLY, [watched])];

    expect(getAccessMode(multisig, wallets)).toEqual('draft');
  });

  it('reports an address with no local account as draft', () => {
    expect(getAccessMode(null, [])).toEqual('draft');
  });

  it('reports a contact multisig (sentinel wallet id) as draft', () => {
    const contactMultisig = multisigAccount({ walletId: -1 });
    const wallets = [makeWallet(2, WalletType.POLKADOT_VAULT, [baseAccount({ walletId: 2, accountId: BOB })])];

    expect(getAccessMode(contactMultisig, wallets)).toEqual('draft');
  });

  it('follows the proxy: a proxied account is direct only when the proxy is local', () => {
    const proxy = baseAccount({ id: 'proxy', walletId: 2, accountId: BOB });
    const proxied = chainAccount({
      id: 'proxied',
      accountId: PROXIED,
      accountType: AccountType.PROXIED,
      connections: [{ proxyAccountId: BOB, delay: 0, proxyType: 'Any' }],
    });

    const withProxy = [makeWallet(1, WalletType.PROXIED, [proxied]), makeWallet(2, WalletType.POLKADOT_VAULT, [proxy])];
    const withoutProxy = [makeWallet(1, WalletType.PROXIED, [proxied])];

    expect(getAccessMode(proxied, withProxy)).toEqual('direct');
    expect(getAccessMode(proxied, withoutProxy)).toEqual('draft');
  });
});

describe('getMultisigThreshold', () => {
  it('reads the threshold off a multisig account', () => {
    const multisig = multisigAccount({
      threshold: 2,
      signatories: [{ accountId: ALICE }, { accountId: BOB }, { accountId: CAROL }],
    });

    expect(getMultisigThreshold(multisig)).toEqual({ threshold: 2, signatories: 3 });
  });

  it('returns null for anything else', () => {
    expect(getMultisigThreshold(baseAccount())).toBeNull();
    expect(getMultisigThreshold(null)).toBeNull();
  });
});
