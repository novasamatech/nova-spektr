import { afterEach, describe, expect, it } from 'vitest';

import { type WatchOnlyAccount, AccountType, CryptoType, SigningType } from '@/shared/core';
import { createAccountId, kusamaChain, kusamaChainId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type ChainAccount, accountService } from '@/domains/network';

import { resolveClaimAccount } from './resolveClaimAccount';

// The vesting key: one address, potentially several local accounts behind it.
const vestingAccountId = createAccountId('1');
const delegateAccountId = createAccountId('2');

type ProxiedAccount = ChainAccount & { proxiedAccountId: AccountId };

const isProxiedAccount = (account: AnyAccount): account is ProxiedAccount => 'proxiedAccountId' in account;
const isWcAccount = (account: AnyAccount) =>
  'accountType' in account && account.accountType === AccountType.WALLET_CONNECT;

const createChainAccount = (overrides: Partial<ChainAccount> & Pick<ChainAccount, 'id'>): ChainAccount => ({
  type: 'chain',
  name: '',
  walletId: 0,
  chainId: polkadotChainId,
  accountId: vestingAccountId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
  ...overrides,
});

/** A watch-only wallet stores its key as a universal account tagged WATCH_ONLY. */
const createWatchOnlyAccount = (): WatchOnlyAccount => ({
  id: 'watch-only',
  type: 'universal',
  name: '',
  walletId: 4,
  accountId: vestingAccountId,
  accountType: AccountType.WATCH_ONLY,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WATCH_ONLY,
  createdAt: 0,
});

/**
 * Mirrors the real SDK handlers: proxied and WalletConnect accounts are only
 * usable on the chain they are bound to, a proxied account signs through its
 * delegate rather than itself, and a watch-only account never signs.
 */
const registerHandlers = () => {
  accountService.accountAvailabilityOnChainAnyOf.registerHandler({
    body: ({ account, chain }) => {
      if (!accountService.isChainAccount(account)) return true;

      return isProxiedAccount(account) || isWcAccount(account) ? account.chainId === chain.chainId : true;
    },
    available: () => true,
  });
  accountService.accountActionPermissionAnyOf.registerHandler({
    body: ({ account }) => {
      if (isProxiedAccount(account)) return false;

      return account.signingType !== SigningType.WATCH_ONLY;
    },
    available: () => true,
  });
  accountService.accountCollectChildrenPipeline.registerHandler({
    body: (children, { account, accounts }) => {
      if (isProxiedAccount(account)) {
        return accounts.filter((a) => a.accountId === account.proxiedAccountId);
      }

      return children;
    },
    available: () => true,
  });
};

describe('resolveClaimAccount', () => {
  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
    accountService.accountCanSignMultipleAnyOf.resetHandlers();
    accountService.accountCollectChildrenPipeline.resetHandlers();
  });

  it('skips a proxied account bound to another chain in favour of the signable one', () => {
    registerHandlers();

    const vaultAccount = createChainAccount({ id: 'vault', walletId: 1 });
    // Auto-discovered on Kusama for the very same key — the account that used
    // to win the accountId lookup and drag its "Any for …" wallet into confirm.
    const proxiedOnKusama: ProxiedAccount = {
      ...createChainAccount({ id: 'proxied', walletId: 2, chainId: kusamaChainId }),
      signingType: SigningType.WATCH_ONLY,
      proxiedAccountId: delegateAccountId,
    };

    // Proxied last: it is discovered after the wallet is imported, which is how
    // it used to win the accountId lookup.
    const allAccounts = [vaultAccount, proxiedOnKusama];

    expect(resolveClaimAccount(allAccounts, polkadotChain, allAccounts)).toEqual({
      account: vaultAccount,
      reason: null,
    });
  });

  it('prefers the account signing directly over an equally valid proxy route', () => {
    registerHandlers();

    const delegate = createChainAccount({ id: 'delegate', walletId: 3, accountId: delegateAccountId });
    const proxiedHere: ProxiedAccount = {
      ...createChainAccount({ id: 'proxied', walletId: 2 }),
      signingType: SigningType.WATCH_ONLY,
      proxiedAccountId: delegateAccountId,
    };
    const vaultAccount = createChainAccount({ id: 'vault', walletId: 1 });

    const allAccounts = [proxiedHere, vaultAccount, delegate];

    expect(resolveClaimAccount([proxiedHere, vaultAccount], polkadotChain, allAccounts).account).toBe(vaultAccount);
  });

  it('falls back to a proxied account that reaches a local delegate', () => {
    registerHandlers();

    const delegate = createChainAccount({ id: 'delegate', walletId: 3, accountId: delegateAccountId });
    const proxiedHere: ProxiedAccount = {
      ...createChainAccount({ id: 'proxied', walletId: 2 }),
      signingType: SigningType.WATCH_ONLY,
      proxiedAccountId: delegateAccountId,
    };

    const allAccounts = [proxiedHere, delegate];

    expect(resolveClaimAccount([proxiedHere], polkadotChain, allAccounts).account).toBe(proxiedHere);
  });

  it('reports no-signer for a proxied account whose delegate is not local', () => {
    registerHandlers();

    const orphanProxied: ProxiedAccount = {
      ...createChainAccount({ id: 'proxied', walletId: 2 }),
      signingType: SigningType.WATCH_ONLY,
      proxiedAccountId: delegateAccountId,
    };

    expect(resolveClaimAccount([orphanProxied], polkadotChain, [orphanProxied])).toEqual({
      account: null,
      reason: 'no-signer',
    });
  });

  it('reports watch-only for a watch-only account', () => {
    registerHandlers();

    const watchOnly = createWatchOnlyAccount();

    expect(resolveClaimAccount([watchOnly], polkadotChain, [watchOnly])).toEqual({
      account: null,
      reason: 'watch-only',
    });
  });

  it('keeps no-signer when a watch-only account sits next to another unsignable one', () => {
    registerHandlers();

    // The generic text has to win: "this is a watch-only account" would be a lie
    // about the orphan proxied account sharing the key.
    const orphanProxied: ProxiedAccount = {
      ...createChainAccount({ id: 'proxied', walletId: 2 }),
      signingType: SigningType.WATCH_ONLY,
      proxiedAccountId: delegateAccountId,
    };
    const candidates = [createWatchOnlyAccount(), orphanProxied];

    expect(resolveClaimAccount(candidates, polkadotChain, candidates)).toEqual({
      account: null,
      reason: 'no-signer',
    });
  });

  it('reports no-local-account when the key belongs to a contact', () => {
    registerHandlers();

    expect(resolveClaimAccount([], polkadotChain, [])).toEqual({ account: null, reason: 'no-local-account' });
  });

  it('reports chain-unsupported for a WalletConnect session that never covered the chain', () => {
    registerHandlers();

    // A WalletConnect wallet carries one account per session chain, all sharing
    // the key. Every one of them can act — none of them is on Polkadot.
    const wcAccounts = [kusamaChainId].map((chainId, index) => ({
      ...createChainAccount({
        id: `wc-${index}`,
        walletId: 18,
        chainId,
        signingType: SigningType.WALLET_CONNECT,
      }),
      accountType: AccountType.WALLET_CONNECT,
    }));

    expect(wcAccounts.every((account) => accountService.hasPermissionToMakeActions(account))).toBe(true);
    expect(resolveClaimAccount(wcAccounts, polkadotChain, wcAccounts)).toEqual({
      account: null,
      reason: 'chain-unsupported',
    });

    // …and it claims normally on a chain the session does cover.
    expect(resolveClaimAccount(wcAccounts, kusamaChain, wcAccounts).account).toBe(wcAccounts[0]);
  });

  it('reports chain-unsupported when the only account is bound to another chain', () => {
    registerHandlers();

    const proxiedOnKusama: ProxiedAccount = {
      ...createChainAccount({ id: 'proxied', walletId: 2, chainId: kusamaChainId }),
      signingType: SigningType.WATCH_ONLY,
      proxiedAccountId: delegateAccountId,
    };

    expect(resolveClaimAccount([proxiedOnKusama], polkadotChain, [proxiedOnKusama])).toEqual({
      account: null,
      reason: 'chain-unsupported',
    });

    // …and it stays claimable on the chain it belongs to, given a local delegate.
    const delegate = createChainAccount({
      id: 'delegate',
      walletId: 3,
      chainId: kusamaChainId,
      accountId: delegateAccountId,
    });
    expect(resolveClaimAccount([proxiedOnKusama], kusamaChain, [proxiedOnKusama, delegate]).account).toBe(
      proxiedOnKusama,
    );
  });
});
