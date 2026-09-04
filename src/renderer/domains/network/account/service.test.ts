import { afterEach, describe, expect, it } from 'vitest';

import {
  type BackendContact,
  type Chain,
  type Contact,
  AccountNameType,
  AccountType,
  CryptoType,
  SigningType,
} from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import {
  createAccountId,
  createPolkadotWallet,
  createSingleShardWallet,
  kusamaChain,
  kusamaChainId,
  mythosChain,
  polkadotChain,
  polkadotChainId,
} from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type IdentityMap } from '../identity/types';

import { accountService } from './service';
import { type AnyAccount, type ChainAccount, type UniversalAccount } from './types';

const chainAccount: ChainAccount = {
  id: 'chain',
  type: 'chain',
  accountId: createAccountId('1'),
  chainId: polkadotChainId,
  name: '',
  walletId: 0,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  createdAt: Date.now(),
};

const kusamaChainAccount: ChainAccount = {
  id: 'kusama',
  type: 'chain',
  accountId: createAccountId('2'),
  chainId: kusamaChainId,
  name: '',
  walletId: 0,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  createdAt: Date.now(),
};

const universalAccount: UniversalAccount = {
  id: 'universal',
  type: 'universal',
  accountId: createAccountId('3'),
  name: '',
  walletId: 0,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  createdAt: Date.now(),
};

const createBackendContact = (
  overrides: Pick<BackendContact, 'id' | 'accountId' | 'name' | 'address'>,
): BackendContact => ({
  source: 'backend',
  chainId: null,
  chainName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories: null,
  threshold: null,
  fields: [],
  ...overrides,
});

describe('account service', () => {
  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
    accountService.accountCanSignMultipleAnyOf.resetHandlers();
    accountService.accountCollectChildrenPipeline.resetHandlers();
  });

  /**
   * The derived constructs every graph test needs: a proxied account reaching
   * its delegate, a multisig reaching its signatories.
   */
  interface TestProxied extends ChainAccount {
    accountType: AccountType.PROXIED;
    connections: { proxyAccountId: AccountId }[];
  }

  interface TestMultisig extends UniversalAccount {
    accountType: AccountType.MULTISIG;
    signatories: { accountId: AccountId }[];
  }

  const isTestProxied = (account: AnyAccount): account is TestProxied =>
    'accountType' in account && account.accountType === AccountType.PROXIED;

  const isTestMultisig = (account: AnyAccount): account is TestMultisig =>
    'accountType' in account && account.accountType === AccountType.MULTISIG;

  /**
   * Mirrors the real SDK handlers: an account acts on the chain it is bound to,
   * a key the user holds signs while a derived construct does not, and a
   * proxied / multisig collects its delegate / signatories as children.
   */
  const registerHandlers = () => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      body: ({ account, chain }) => (accountService.isChainAccount(account) ? account.chainId === chain.chainId : true),
      available: () => true,
    });
    // a "signable" leaf is a key the user holds — a Vault or WalletConnect
    // account; proxied, multisig and watch-only constructs are not
    accountService.accountActionPermissionAnyOf.registerHandler({
      body: ({ account }) =>
        account.signingType === SigningType.POLKADOT_VAULT || account.signingType === SigningType.WALLET_CONNECT,
      available: () => true,
    });
    accountService.accountCollectChildrenPipeline.registerHandler({
      body(children, { account, accounts }) {
        if (isTestProxied(account)) {
          return accounts.filter(a => account.connections.some(c => c.proxyAccountId === a.accountId)).concat(children);
        }
        if (isTestMultisig(account)) {
          return accounts.filter(a => account.signatories.some(s => s.accountId === a.accountId)).concat(children);
        }

        return children;
      },
      available: () => true,
    });
  };

  it('should check account types', async () => {
    expect(accountService.isChainAccount(chainAccount)).toEqual(true);
    expect(accountService.isChainAccount(universalAccount)).toEqual(false);
    expect(accountService.isUniversalAccount(universalAccount)).toEqual(true);
    expect(accountService.isUniversalAccount(chainAccount)).toEqual(false);
  });

  it('should filter accounts by chainId', async () => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      body: ({ account, chain }) => (accountService.isChainAccount(account) ? account.chainId === chain.chainId : true),
      available: () => true,
    });
    const filtered = accountService.filterAccountsOnChain(
      [chainAccount, kusamaChainAccount, universalAccount],
      polkadotChain,
    );

    expect(filtered).toEqual([chainAccount, universalAccount]);
  });

  describe('canReceiveOnChain', () => {
    const watchOnlyAccount: UniversalAccount = {
      ...universalAccount,
      id: 'watch-only',
      signingType: SigningType.WATCH_ONLY,
    };

    const multisigAccount: ChainAccount = {
      ...kusamaChainAccount,
      id: 'multisig',
      signingType: SigningType.MULTISIG,
    };

    it('should let a keyed key of another chain receive on a scheme-compatible chain', () => {
      // Vault key derived for Kusama, no availability handler registered
      expect(accountService.canReceiveOnChain(kusamaChainAccount, polkadotChain)).toEqual(true);
    });

    it('should keep the strict availability rule for keyless accounts on a foreign chain', () => {
      accountService.accountAvailabilityOnChainAnyOf.registerHandler({
        body: ({ account, chain }) =>
          accountService.isChainAccount(account) ? account.chainId === chain.chainId : false,
        available: () => true,
      });

      expect(accountService.canReceiveOnChain(watchOnlyAccount, polkadotChain)).toEqual(false);
      expect(accountService.canReceiveOnChain(multisigAccount, polkadotChain)).toEqual(false);
      expect(accountService.canReceiveOnChain(multisigAccount, kusamaChain)).toEqual(true);
    });

    it('should reject an address-scheme mismatch even for keyed accounts', () => {
      expect(accountService.canReceiveOnChain(chainAccount, mythosChain)).toEqual(false);
    });
  });

  describe('graph', () => {
    interface ProxyAccount extends ChainAccount {
      proxiedAccountId: AccountId;
    }

    const isProxiedAccount = (a: AnyAccount): a is ProxyAccount => {
      return 'proxiedAccountId' in a;
    };

    it('should create graphs', async () => {
      const firstProxyAccount: ProxyAccount = {
        id: '',
        type: 'chain',
        name: 'test',
        walletId: 0,
        chainId: polkadotChainId,
        accountId: createAccountId('1'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WALLET_CONNECT,
        createdAt: Date.now(),
        proxiedAccountId: createAccountId('2'),
      };

      const secondProxyAccount: ProxyAccount = {
        id: '',
        type: 'chain',
        name: 'test',
        walletId: 1,
        chainId: polkadotChainId,
        accountId: createAccountId('2'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WALLET_CONNECT,
        createdAt: Date.now(),
        proxiedAccountId: createAccountId('3'),
      };

      const leafAccount: ChainAccount = {
        id: '',
        type: 'chain',
        name: 'test',
        walletId: 2,
        chainId: polkadotChainId,
        accountId: createAccountId('3'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        createdAt: Date.now(),
      };

      const accounts = [leafAccount, secondProxyAccount, firstProxyAccount];

      accountService.accountAvailabilityOnChainAnyOf.registerHandler({
        body: () => true,
        available: () => true,
      });
      accountService.accountActionPermissionAnyOf.registerHandler({
        body: () => true,
        available: () => true,
      });
      accountService.accountCollectChildrenPipeline.registerHandler({
        body(children, { account, accounts }) {
          if (isProxiedAccount(account)) {
            return accounts.filter(a => a.accountId === account.proxiedAccountId);
          }
          return children;
        },
        available: () => true,
      });

      const graphs = accountService.createAccountGraphs(accounts, polkadotChain);

      const firstProxyNode = graphs.get(firstProxyAccount);
      const secondProxyNode = graphs.get(secondProxyAccount);
      const childNode = graphs.get(leafAccount);

      assert(firstProxyNode, 'graph should include first proxy account');
      assert(secondProxyNode, 'graph should include second proxy account');
      assert(childNode, 'graph should include child account');

      expect(firstProxyNode.children.length).toBe(1);
      expect(secondProxyNode.children.length).toBe(1);
      expect(childNode.children.length).toBe(0);
    });

    it('should find accounts route', async () => {
      const firstProxyAccount: ProxyAccount = {
        id: 'first-proxy',
        type: 'chain',
        name: 'test',
        walletId: 0,
        chainId: polkadotChainId,
        accountId: createAccountId('1'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WATCH_ONLY,
        createdAt: Date.now(),
        proxiedAccountId: createAccountId('2'),
      };

      const secondProxyAccount: ProxyAccount = {
        id: 'second-proxy',
        type: 'chain',
        name: 'test',
        walletId: 1,
        chainId: polkadotChainId,
        accountId: createAccountId('2'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WATCH_ONLY,
        createdAt: Date.now(),
        proxiedAccountId: createAccountId('3'),
      };

      const leafAccount: ChainAccount = {
        id: 'leaf-account',
        type: 'chain',
        name: 'test',
        walletId: 2,
        chainId: polkadotChainId,
        accountId: createAccountId('3'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        createdAt: Date.now(),
      };

      const accounts = [leafAccount, secondProxyAccount, firstProxyAccount];

      accountService.accountAvailabilityOnChainAnyOf.registerHandler({
        body: ({ account, chain }) =>
          accountService.isChainAccount(account) ? account.chainId === chain.chainId : true,
        available: () => true,
      });
      accountService.accountActionPermissionAnyOf.registerHandler({
        body: () => true,
        available: () => true,
      });
      accountService.accountCollectChildrenPipeline.registerHandler({
        body(children, { account, accounts }) {
          if (isProxiedAccount(account)) {
            return accounts.filter(a => a.accountId === account.proxiedAccountId);
          }
          return children;
        },
        available: () => true,
      });

      expect(accountService.findRoute(firstProxyAccount, leafAccount, accounts, polkadotChain)).toEqual([
        firstProxyAccount,
        secondProxyAccount,
        leafAccount,
      ]);
    });

    it('should find signatories', async () => {
      const proxy: ProxyAccount = {
        id: '',
        type: 'chain',
        name: 'test',
        walletId: 1,
        chainId: polkadotChainId,
        accountId: createAccountId('2'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WALLET_CONNECT,
        createdAt: Date.now(),
        proxiedAccountId: createAccountId('3'),
      };

      const extensionAccount: ChainAccount = {
        id: '',
        type: 'chain',
        name: 'test',
        walletId: 2,
        chainId: polkadotChainId,
        accountId: createAccountId('3'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.EXTENSION,
        createdAt: Date.now(),
      };

      const wcAccount: ChainAccount = {
        id: '',
        type: 'chain',
        name: 'test',
        walletId: 2,
        chainId: polkadotChainId,
        accountId: createAccountId('3'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WALLET_CONNECT,
        createdAt: Date.now(),
      };

      const accounts = [proxy, extensionAccount, wcAccount];

      accountService.accountAvailabilityOnChainAnyOf.registerHandler({
        body: ({ account, chain }) =>
          accountService.isChainAccount(account) ? account.chainId === chain.chainId : true,
        available: () => true,
      });
      accountService.accountActionPermissionAnyOf.registerHandler({
        body: () => true,
        available: () => true,
      });
      accountService.accountCollectChildrenPipeline.registerHandler({
        body(children, { account, accounts }) {
          if (isProxiedAccount(account)) {
            return accounts.filter(a => a.accountId === account.proxiedAccountId);
          }
          return children;
        },
        available: () => true,
      });

      expect(accountService.findSignatories(proxy, accounts, polkadotChain)).toEqual([extensionAccount, wcAccount]);
    });

    it('should find initiators', async () => {
      const proxy: ProxyAccount = {
        id: '',
        type: 'chain',
        name: 'test',
        walletId: 1,
        chainId: polkadotChainId,
        accountId: createAccountId('2'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WALLET_CONNECT,
        createdAt: Date.now(),
        proxiedAccountId: createAccountId('3'),
      };

      const pvAccount: ChainAccount = {
        id: '',
        type: 'chain',
        name: 'test',
        walletId: 2,
        chainId: polkadotChainId,
        accountId: createAccountId('3'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        createdAt: Date.now(),
      };

      const accounts = [proxy, pvAccount];

      accountService.accountAvailabilityOnChainAnyOf.registerHandler({
        body: ({ account, chain }) =>
          accountService.isChainAccount(account) ? account.chainId === chain.chainId : true,
        available: () => true,
      });
      accountService.accountActionPermissionAnyOf.registerHandler({
        body: () => true,
        available: () => true,
      });
      accountService.accountCollectChildrenPipeline.registerHandler({
        body(children, { account, accounts }) {
          if (isProxiedAccount(account)) {
            return accounts.filter(a => a.accountId === account.proxiedAccountId);
          }
          return children;
        },
        available: () => true,
      });

      expect(accountService.findInitiators(accounts, polkadotChain)).toEqual([proxy]);
    });
  });

  describe('findAccountsWithoutSigners', () => {
    const chains: Record<string, Chain> = {
      [polkadotChainId]: polkadotChain,
      [kusamaChainId]: kusamaChain,
    };

    const signerKey: ChainAccount = {
      id: 'signer',
      type: 'chain',
      name: 'signer',
      walletId: 1,
      chainId: polkadotChainId,
      accountId: createAccountId('signer'),
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.POLKADOT_VAULT,
      createdAt: Date.now(),
    };

    const proxied: TestProxied = {
      id: 'proxied',
      type: 'chain',
      accountType: AccountType.PROXIED,
      name: 'proxied',
      walletId: 2,
      chainId: polkadotChainId,
      accountId: createAccountId('proxied'),
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      createdAt: Date.now(),
      connections: [{ proxyAccountId: signerKey.accountId }],
    };

    const multisig: TestMultisig = {
      id: 'multisig',
      type: 'universal',
      accountType: AccountType.MULTISIG,
      name: 'multisig',
      walletId: 3,
      accountId: createAccountId('multisig'),
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      createdAt: Date.now(),
      signatories: [{ accountId: signerKey.accountId }],
    };

    it('keeps a proxied while its delegate is a signable local account', () => {
      registerHandlers();

      expect(accountService.findAccountsWithoutSigners([signerKey, proxied], chains)).toEqual([]);
    });

    it('orphans a proxied once its last signable delegate is gone', () => {
      registerHandlers();

      expect(accountService.findAccountsWithoutSigners([proxied], chains)).toEqual([proxied]);
    });

    it('orphans a multisig once its last signatory is gone', () => {
      registerHandlers();

      expect(accountService.findAccountsWithoutSigners([signerKey, multisig], chains)).toEqual([]);
      expect(accountService.findAccountsWithoutSigners([multisig], chains)).toEqual([multisig]);
    });

    it('collapses a whole chain at once (proxied of a multisig of a removed key)', () => {
      registerHandlers();

      const proxiedOfMultisig: TestProxied = {
        ...proxied,
        id: 'proxied-of-multisig',
        walletId: 4,
        accountId: createAccountId('proxied-of-multisig'),
        connections: [{ proxyAccountId: multisig.accountId }],
      };

      const all = [signerKey, multisig, proxiedOfMultisig];

      expect(accountService.findAccountsWithoutSigners(all, chains)).toEqual([]);

      // remove the only signable key: both the multisig and the proxied above it collapse
      const orphans = accountService.findAccountsWithoutSigners([multisig, proxiedOfMultisig], chains);
      expect(orphans).toEqual(expect.arrayContaining([multisig, proxiedOfMultisig]));
      expect(orphans).toHaveLength(2);
    });

    it('keeps a universal multisig while it is signable on any one chain', () => {
      registerHandlers();

      const kusamaSigner: ChainAccount = {
        ...signerKey,
        id: 'kusama-signer',
        walletId: 5,
        chainId: kusamaChainId,
        accountId: createAccountId('kusama-signer'),
      };
      const kusamaMultisig: TestMultisig = {
        ...multisig,
        signatories: [{ accountId: kusamaSigner.accountId }],
      };

      // signable only on kusama, but the cross-chain pass keeps it
      expect(accountService.findAccountsWithoutSigners([kusamaSigner, kusamaMultisig], chains)).toEqual([]);
      // signer gone everywhere → orphaned
      expect(accountService.findAccountsWithoutSigners([kusamaMultisig], chains)).toEqual([kusamaMultisig]);
    });

    it('keeps a derived account it cannot evaluate on any provided chain', () => {
      registerHandlers();

      // no chains to build a graph on → nothing is evaluated, so nothing is deleted
      expect(accountService.findAccountsWithoutSigners([proxied], {})).toEqual([]);
    });
  });

  describe('resolveSigningAccount', () => {
    /**
     * A watch-only wallet stores its key as a universal account tagged
     * WATCH_ONLY.
     */
    interface TestWatchOnly extends UniversalAccount {
      accountType: AccountType.WATCH_ONLY;
    }

    const keyId = createAccountId('locked');
    const signatoryId = createAccountId('signatory');
    const delegateId = createAccountId('delegate');

    const createKeyed = (overrides: Partial<ChainAccount> & Pick<ChainAccount, 'id'>): ChainAccount => ({
      type: 'chain',
      name: '',
      walletId: 1,
      chainId: polkadotChainId,
      accountId: keyId,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.POLKADOT_VAULT,
      createdAt: 0,
      ...overrides,
    });

    const createWatchOnly = (): TestWatchOnly => ({
      id: 'watch-only',
      type: 'universal',
      name: '',
      walletId: 4,
      accountId: keyId,
      accountType: AccountType.WATCH_ONLY,
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      createdAt: 0,
    });

    const createMultisig = (): TestMultisig => ({
      id: 'multisig',
      type: 'universal',
      name: '',
      walletId: 2,
      accountId: keyId,
      accountType: AccountType.MULTISIG,
      signatories: [{ accountId: signatoryId }],
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.MULTISIG,
      createdAt: 0,
    });

    it('reports no-local-account when the key belongs to nobody local', () => {
      registerHandlers();

      expect(accountService.resolveSigningAccount([], polkadotChain, [])).toEqual({
        account: null,
        reason: 'no-local-account',
      });
    });

    it('reports chain-unsupported for a WalletConnect session that never covered the chain', () => {
      registerHandlers();

      // A WalletConnect wallet carries one account per session chain, all
      // sharing the key. Every one of them can sign — none of them is on
      // Polkadot, so the block is about the chain, not about the key.
      const wcAccounts = [kusamaChainId].map((chainId, index) => ({
        ...createKeyed({ id: `wc-${index}`, walletId: 18, chainId, signingType: SigningType.WALLET_CONNECT }),
        accountType: AccountType.WALLET_CONNECT,
      }));

      expect(wcAccounts.every(account => accountService.hasPermissionToMakeActions(account))).toBe(true);
      expect(accountService.resolveSigningAccount(wcAccounts, polkadotChain, wcAccounts)).toEqual({
        account: null,
        reason: 'chain-unsupported',
      });

      // …and it signs normally on a chain the session does cover.
      expect(accountService.resolveSigningAccount(wcAccounts, kusamaChain, wcAccounts).account).toBe(wcAccounts[0]);
    });

    it('reports chain-unsupported for a proxied account bound to another chain', () => {
      registerHandlers();

      const proxiedOnKusama: TestProxied = {
        ...createKeyed({ id: 'proxied', walletId: 2, chainId: kusamaChainId }),
        accountType: AccountType.PROXIED,
        signingType: SigningType.WATCH_ONLY,
        connections: [{ proxyAccountId: delegateId }],
      };

      expect(accountService.resolveSigningAccount([proxiedOnKusama], polkadotChain, [proxiedOnKusama])).toEqual({
        account: null,
        reason: 'chain-unsupported',
      });

      // …and on the chain it belongs to it signs through its local delegate.
      const delegate = createKeyed({
        id: 'delegate',
        walletId: 3,
        chainId: kusamaChainId,
        accountId: delegateId,
      });

      expect(
        accountService.resolveSigningAccount([proxiedOnKusama], kusamaChain, [proxiedOnKusama, delegate]).account,
      ).toBe(proxiedOnKusama);
    });

    it('reports watch-only when nothing but a watch-only account holds the key', () => {
      registerHandlers();

      const watchOnly = createWatchOnly();

      expect(accountService.resolveSigningAccount([watchOnly], polkadotChain, [watchOnly])).toEqual({
        account: null,
        reason: 'watch-only',
      });
    });

    it('reports no-signer when an unsignable non-watch-only account shares the key', () => {
      registerHandlers();

      // The generic text has to win: "this is a watch-only account" would be a
      // lie about the orphan multisig sharing the key.
      const candidates = [createWatchOnly(), createMultisig()];

      expect(accountService.resolveSigningAccount(candidates, polkadotChain, candidates)).toEqual({
        account: null,
        reason: 'no-signer',
      });
    });

    it('falls back to a multisig that reaches a local signatory', () => {
      registerHandlers();

      const multisig = createMultisig();
      const signatory = createKeyed({ id: 'signatory', walletId: 3, accountId: signatoryId });

      expect(accountService.resolveSigningAccount([multisig], polkadotChain, [multisig, signatory]).account).toBe(
        multisig,
      );
    });

    it('prefers the account signing directly over an equally valid multisig route', () => {
      registerHandlers();

      const multisig = createMultisig();
      const signatory = createKeyed({ id: 'signatory', walletId: 3, accountId: signatoryId });
      const keyed = createKeyed({ id: 'vault', walletId: 1 });

      // Multisig first, as auto-discovery would order it.
      expect(
        accountService.resolveSigningAccount([multisig, keyed], polkadotChain, [multisig, keyed, signatory]).account,
      ).toBe(keyed);
    });

    it('lets the preferred wallet win the tie when the same key lives in two wallets', () => {
      registerHandlers();

      const inVault = createKeyed({ id: 'vault', walletId: 1 });
      const inOtherWallet = createKeyed({ id: 'other', walletId: 7 });
      const candidates = [inVault, inOtherWallet];

      expect(
        accountService.resolveSigningAccount(candidates, polkadotChain, candidates, { preferredWalletId: 7 }).account,
      ).toBe(inOtherWallet);
      // …and without a preference the input order stands.
      expect(accountService.resolveSigningAccount(candidates, polkadotChain, candidates).account).toBe(inVault);
    });

    it('keeps the preference a tie-break within a tier, not an override across tiers', () => {
      registerHandlers();

      const inVault = createKeyed({ id: 'vault', walletId: 1 });
      const multisig = { ...createMultisig(), walletId: 7 };
      const signatory = createKeyed({ id: 'signatory', walletId: 3, accountId: signatoryId });
      const candidates = [inVault, multisig];

      // The multisig sits in the preferred wallet and still loses: signing
      // directly is one click, the multisig route needs signatures collected.
      expect(
        accountService.resolveSigningAccount(candidates, polkadotChain, [...candidates, signatory], {
          preferredWalletId: 7,
        }).account,
      ).toBe(inVault);
    });
  });

  describe('resolveAccountName', () => {
    const accountId = createAccountId('test');
    const chains: Record<string, Chain> = {
      [polkadotChainId]: polkadotChain,
      [kusamaChainId]: kusamaChain,
    };
    const accounts: AnyAccount[] = [chainAccount];
    const emptyContacts: Contact[] = [];
    const emptyIdentities: IdentityMap = {};

    it('should return title if provided', () => {
      const result = accountService.resolveAccountName({
        accountId,
        chain: polkadotChain,
        accounts,
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
        title: 'Custom Title',
      });

      expect(result).toBe('Custom Title');
    });

    it('should return contact name if contact exists', () => {
      const contacts: Contact[] = [
        {
          id: 'test-uuid-1',
          accountId,
          name: 'Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
          source: 'local',
        },
      ];

      const result = accountService.resolveAccountName({
        accountId,
        chain: polkadotChain,
        accounts,
        contacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Contact Name');
    });

    it('should prioritize contact over identity', () => {
      const contacts: Contact[] = [
        {
          id: 'test-uuid-1',
          accountId,
          name: 'Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
          source: 'local',
        },
      ];

      const identities: IdentityMap = {
        [polkadotChainId]: {
          [accountId]: {
            chainId: polkadotChainId,
            accountId,
            name: 'Identity Name',
            email: '',
            image: '',
            website: '',
          },
        },
      };

      const result = accountService.resolveAccountName({
        accountId,
        chain: polkadotChain,
        accounts,
        contacts,
        identities,
        chains,
      });

      expect(result).toBe('Contact Name');
    });

    it('should return identity name if no contact', () => {
      const identities: IdentityMap = {
        [polkadotChainId]: {
          [accountId]: {
            chainId: polkadotChainId,
            accountId,
            name: 'Identity Name',
            email: '',
            image: '',
            website: '',
          },
        },
      };

      const result = accountService.resolveAccountName({
        accountId,
        chain: polkadotChain,
        accounts,
        contacts: emptyContacts,
        identities,
        chains,
      });

      expect(result).toBe('Identity Name');
    });

    it('should return short address if no contact, identity or stored account name', () => {
      const result = accountService.resolveAccountName({
        accountId,
        chain: polkadotChain,
        accounts,
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toMatch(/^[A-Za-z0-9]{5}\.\.\.[A-Za-z0-9]{5}$/);
    });

    it('should return the stored generated name if no contact or identity match', () => {
      const generatedAccountId = createAccountId('generated');
      const generatedAccount: ChainAccount = {
        ...chainAccount,
        accountId: generatedAccountId,
        nameType: AccountNameType.GENERATED,
        name: 'Main',
      };

      const result = accountService.resolveAccountName({
        accountId: generatedAccountId,
        chain: polkadotChain,
        accounts: [generatedAccount],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Main');
    });

    it('should use fallbackName over a generated stored name', () => {
      const derivedAccountId = createAccountId('derived');
      const derivedAccount: ChainAccount = {
        ...chainAccount,
        accountId: derivedAccountId,
        nameType: AccountNameType.GENERATED,
        name: '//polkadot//0',
      };

      const result = accountService.resolveAccountName({
        accountId: derivedAccountId,
        chain: polkadotChain,
        accounts: [derivedAccount],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
        fallbackName: 'Adams Keyset',
      });

      expect(result).toBe('Adams Keyset');
    });

    it('should prioritize a backend contact over fallbackName', () => {
      const contacts: Contact[] = [
        createBackendContact({
          id: 'test-uuid-backend',
          accountId,
          name: 'FINOPS_DOT_ADAM',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
        }),
      ];

      const result = accountService.resolveAccountName({
        accountId,
        chain: polkadotChain,
        accounts,
        contacts,
        identities: emptyIdentities,
        chains,
        fallbackName: 'Adams Keyset',
      });

      expect(result).toBe('FINOPS_DOT_ADAM');
    });

    it('should prioritize a custom account name over fallbackName', () => {
      const customAccountId = createAccountId('custom-over-fallback');
      const customAccount: ChainAccount = {
        ...chainAccount,
        accountId: customAccountId,
        nameType: AccountNameType.CUSTOM,
        name: 'Custom Account Name',
      };

      const result = accountService.resolveAccountName({
        accountId: customAccountId,
        chain: polkadotChain,
        accounts: [customAccount],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
        fallbackName: 'Adams Keyset',
      });

      expect(result).toBe('Custom Account Name');
    });

    it('should use fallbackName instead of the short address for an unknown account', () => {
      const unknownAccountId = createAccountId('unknown-with-fallback');

      const result = accountService.resolveAccountName({
        accountId: unknownAccountId,
        chain: polkadotChain,
        accounts: [],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
        fallbackName: 'Adams Keyset',
      });

      expect(result).toBe('Adams Keyset');
    });

    it('skips an address-shaped fallback and keeps the stored account name', () => {
      const multisigAccountId = createAccountId('multisig-with-address-fallback');
      const multisigAccount: ChainAccount = {
        ...chainAccount,
        accountId: multisigAccountId,
        nameType: AccountNameType.GENERATED,
        name: 'E2E Multisig',
      };

      const result = accountService.resolveAccountName({
        accountId: multisigAccountId,
        chain: polkadotChain,
        accounts: [multisigAccount],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
        fallbackName: toShortAddress(toAddress(multisigAccountId, { prefix: polkadotChain.addressPrefix }), 5),
      });

      expect(result).toBe('E2E Multisig');
    });

    it('skips an address-shaped fallback and falls through to the short address for an unknown account', () => {
      const unknownAccountId = createAccountId('unknown-with-address-fallback');

      const result = accountService.resolveAccountName({
        accountId: unknownAccountId,
        chain: polkadotChain,
        accounts: [],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
        fallbackName: toShortAddress(toAddress(unknownAccountId, { prefix: polkadotChain.addressPrefix }), 6),
      });

      expect(result).toBe(toShortAddress(toAddress(unknownAccountId, { prefix: polkadotChain.addressPrefix }), 5));
    });

    it('keeps a user-typed wallet name that happens to look like a shortened address', () => {
      const unknownAccountId = createAccountId('unknown-with-address-like-wallet-name');

      const result = accountService.resolveAccountName({
        accountId: unknownAccountId,
        chain: polkadotChain,
        accounts: [],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
        fallbackName: 'Main...Vault',
      });

      expect(result).toBe('Main...Vault');
    });

    it('should prioritize custom name over local contact', () => {
      const customAccountId = createAccountId('test');
      const customAccount: ChainAccount = {
        ...chainAccount,
        accountId: customAccountId,
        nameType: AccountNameType.CUSTOM,
        name: 'Custom Account Name',
      };

      const contacts: Contact[] = [
        {
          id: 'test-uuid-1',
          accountId: customAccountId,
          name: 'Local Contact Name',
          address: toAddress(customAccountId, { prefix: polkadotChain.addressPrefix }),
          source: 'local',
        },
      ];

      const result = accountService.resolveAccountName({
        accountId: customAccountId,
        chain: polkadotChain,
        accounts: [customAccount],
        contacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Custom Account Name');
    });

    it('should prioritize local contact over backend contact', () => {
      const contacts: Contact[] = [
        createBackendContact({
          id: 'test-uuid-backend',
          accountId,
          name: 'Backend Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
        }),
        {
          id: 'test-uuid-local',
          accountId,
          name: 'Local Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
          source: 'local',
        },
      ];

      const result = accountService.resolveAccountName({
        accountId,
        chain: polkadotChain,
        accounts,
        contacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Local Contact Name');
    });

    it('should prioritize backend contact over identity', () => {
      const contacts: Contact[] = [
        createBackendContact({
          id: 'test-uuid-backend',
          accountId,
          name: 'Backend Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
        }),
      ];

      const identities: IdentityMap = {
        [polkadotChainId]: {
          [accountId]: {
            chainId: polkadotChainId,
            accountId,
            name: 'Identity Name',
            email: '',
            image: '',
            website: '',
          },
        },
      };

      const result = accountService.resolveAccountName({
        accountId,
        chain: polkadotChain,
        accounts,
        contacts,
        identities,
        chains,
      });

      expect(result).toBe('Backend Contact Name');
    });

    it('should use the passed-in account instead of re-deriving it from accountId, when a different account shares the same accountId', () => {
      const sharedAccountId = createAccountId('shared');

      // Found first by a plain accountId-only lookup, and CUSTOM — would win under
      // the old accounts.find(accountId) logic even though it's the wrong account.
      const arrayFirstAccount: ChainAccount = {
        ...chainAccount,
        id: 'array-first',
        accountId: sharedAccountId,
        nameType: AccountNameType.CUSTOM,
        name: 'Array First',
      };
      // The account the caller actually knows it's resolving a name for.
      const passedAccount: ChainAccount = {
        ...chainAccount,
        id: 'passed',
        accountId: sharedAccountId,
        nameType: AccountNameType.GENERATED,
        name: 'Passed Account',
      };

      const result = accountService.resolveAccountName({
        accountId: sharedAccountId,
        chain: polkadotChain,
        account: passedAccount,
        accounts: [arrayFirstAccount, passedAccount],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Passed Account');
    });

    it('should prefer a chain-matching account when accountId is ambiguous and no specific account is passed', () => {
      const sharedAccountId = createAccountId('shared-chain');

      const kusamaCandidate: ChainAccount = {
        ...chainAccount,
        id: 'kusama-candidate',
        accountId: sharedAccountId,
        chainId: kusamaChainId,
        nameType: AccountNameType.GENERATED,
        name: 'Kusama Candidate',
      };
      const polkadotCandidate: ChainAccount = {
        ...chainAccount,
        id: 'polkadot-candidate',
        accountId: sharedAccountId,
        chainId: polkadotChainId,
        nameType: AccountNameType.GENERATED,
        name: 'Polkadot Candidate',
      };

      const result = accountService.resolveAccountName({
        accountId: sharedAccountId,
        chain: polkadotChain,
        // Kusama candidate listed first — a plain array-order find would pick it.
        accounts: [kusamaCandidate, polkadotCandidate],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Polkadot Candidate');
    });

    it('should prefer a CUSTOM-named account over a GENERATED one when accountId is ambiguous and chain does not disambiguate', () => {
      const sharedAccountId = createAccountId('shared-custom');

      // e.g. a Vault-derived key's raw derivation path...
      const generatedCandidate: ChainAccount = {
        ...chainAccount,
        id: 'generated-candidate',
        accountId: sharedAccountId,
        nameType: AccountNameType.GENERATED,
        name: '//kusama//hot//0',
      };
      // ...that shouldn't shadow a user's custom-named watch-only account for the same address.
      const customCandidate: ChainAccount = {
        ...chainAccount,
        id: 'custom-candidate',
        accountId: sharedAccountId,
        nameType: AccountNameType.CUSTOM,
        name: 'My Watch-Only',
      };

      const result = accountService.resolveAccountName({
        accountId: sharedAccountId,
        chain: null,
        // Generated candidate listed first — a plain array-order find would pick it.
        accounts: [generatedCandidate, customCandidate],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('My Watch-Only');
    });
  });

  describe('resolveWalletName', () => {
    const accountId = createAccountId('test');
    const walletId = 1;
    const chains: Record<string, Chain> = {
      [polkadotChainId]: polkadotChain,
      [kusamaChainId]: kusamaChain,
    };
    const emptyContacts: Contact[] = [];
    const emptyIdentities: IdentityMap = {};

    it('should return wallet name if no accountId found', () => {
      const wallet = createSingleShardWallet(walletId, {
        rootAccountId: accountId,
        name: 'Test Wallet',
      });

      const accounts: AnyAccount[] = [];

      const result = accountService.resolveWalletName({
        wallet,
        accounts,
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Test Wallet');
    });

    it('should return contact name if contact exists for wallet account', () => {
      const wallet = createSingleShardWallet(walletId, {
        rootAccountId: accountId,
        name: 'Test Wallet',
      });

      const walletAccount: ChainAccount = {
        ...chainAccount,
        accountId,
        walletId,
      };

      const accounts: AnyAccount[] = [walletAccount];
      const contacts: Contact[] = [
        {
          id: 'test-uuid-1',
          accountId,
          name: 'Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
          source: 'local',
        },
      ];

      const result = accountService.resolveWalletName({
        wallet,
        accounts,
        contacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Contact Name');
    });

    it('should return custom wallet name if isCustomWalletName returns true', () => {
      const wallet = createSingleShardWallet(walletId, {
        rootAccountId: accountId,
        name: 'Custom Wallet Name',
      });

      const walletAccount: ChainAccount = {
        ...chainAccount,
        accountId,
        walletId,
        nameType: AccountNameType.CUSTOM,
        name: 'Custom Wallet Name',
      };

      const accounts: AnyAccount[] = [walletAccount];

      const result = accountService.resolveWalletName({
        wallet,
        accounts,
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Custom Wallet Name');
    });

    it('should return identity name if no contact and not custom name', () => {
      const wallet = createSingleShardWallet(walletId, {
        rootAccountId: accountId,
        name: 'Default Wallet Name',
      });

      const walletAccount: ChainAccount = {
        ...chainAccount,
        accountId,
        walletId,
        nameType: AccountNameType.GENERATED,
        name: 'Generated Name',
      };

      const accounts: AnyAccount[] = [walletAccount];
      const identities: IdentityMap = {
        [polkadotChainId]: {
          [accountId]: {
            chainId: polkadotChainId,
            accountId,
            name: 'Identity Name',
            email: '',
            image: '',
            website: '',
          },
        },
      };

      const result = accountService.resolveWalletName({
        wallet,
        accounts,
        contacts: emptyContacts,
        identities,
        chains,
      });

      expect(result).toBe('Identity Name');
    });

    it('should return short address as fallback when account exists', () => {
      const wallet = createSingleShardWallet(walletId, {
        rootAccountId: accountId,
        name: 'Fallback Wallet Name',
      });

      const walletAccount: ChainAccount = {
        ...chainAccount,
        accountId,
        walletId,
        nameType: AccountNameType.GENERATED,
        name: 'Generated Name',
      };

      const accounts: AnyAccount[] = [walletAccount];

      const result = accountService.resolveWalletName({
        wallet,
        accounts,
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toMatch(/^[A-Za-z0-9]{5}\.\.\.[A-Za-z0-9]{5}$/);
    });

    it('should prioritize custom name over local contact', () => {
      const wallet = createSingleShardWallet(walletId, {
        rootAccountId: accountId,
        name: 'Wallet Name',
      });

      const walletAccount: ChainAccount = {
        ...chainAccount,
        accountId,
        walletId,
        nameType: AccountNameType.CUSTOM,
        name: 'Custom Wallet Name',
      };

      const contacts: Contact[] = [
        {
          id: 'test-uuid-1',
          accountId,
          name: 'Local Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
          source: 'local',
        },
      ];

      const result = accountService.resolveWalletName({
        wallet,
        accounts: [walletAccount],
        contacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Custom Wallet Name');
    });

    it('should prioritize local contact over backend contact', () => {
      const wallet = createSingleShardWallet(walletId, {
        rootAccountId: accountId,
        name: 'Wallet Name',
      });

      const walletAccount: ChainAccount = {
        ...chainAccount,
        accountId,
        walletId,
        nameType: AccountNameType.GENERATED,
        name: 'Generated Name',
      };

      const contacts: Contact[] = [
        createBackendContact({
          id: 'test-uuid-backend',
          accountId,
          name: 'Backend Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
        }),
        {
          id: 'test-uuid-local',
          accountId,
          name: 'Local Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
          source: 'local',
        },
      ];

      const result = accountService.resolveWalletName({
        wallet,
        accounts: [walletAccount],
        contacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('Local Contact Name');
    });

    it('should prioritize backend contact over identity', () => {
      const wallet = createSingleShardWallet(walletId, {
        rootAccountId: accountId,
        name: 'Wallet Name',
      });

      const walletAccount: ChainAccount = {
        ...chainAccount,
        accountId,
        walletId,
        nameType: AccountNameType.GENERATED,
        name: 'Generated Name',
      };

      const contacts: Contact[] = [
        createBackendContact({
          id: 'test-uuid-backend',
          accountId,
          name: 'Backend Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
        }),
      ];

      const identities: IdentityMap = {
        [polkadotChainId]: {
          [accountId]: {
            chainId: polkadotChainId,
            accountId,
            name: 'Identity Name',
            email: '',
            image: '',
            website: '',
          },
        },
      };

      const result = accountService.resolveWalletName({
        wallet,
        accounts: [walletAccount],
        contacts,
        identities,
        chains,
      });

      expect(result).toBe('Backend Contact Name');
    });

    it('should return wallet name when no account matches rootAccountId (key-set vault)', () => {
      const rootAccountId = createAccountId('root');
      const wallet = createPolkadotWallet(walletId, {
        rootAccountId,
        name: 'My Vault Wallet',
      });

      // Derived chain accounts have different accountIds than rootAccountId
      const derivedAccount: ChainAccount = {
        ...chainAccount,
        accountId: createAccountId('derived1'),
        walletId,
      };

      const result = accountService.resolveWalletName({
        wallet,
        accounts: [derivedAccount],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('My Vault Wallet');
    });

    it('should return wallet name over local contact when no account matches rootAccountId', () => {
      const rootAccountId = createAccountId('root');
      const wallet = createPolkadotWallet(walletId, {
        rootAccountId,
        name: 'My Vault Wallet',
      });

      const derivedAccount: ChainAccount = {
        ...chainAccount,
        accountId: createAccountId('derived1'),
        walletId,
      };

      // Contact exists for rootAccountId, but wallet name should take precedence
      const contacts: Contact[] = [
        {
          id: 'test-uuid-1',
          accountId: rootAccountId,
          name: 'Contact Name',
          address: toAddress(rootAccountId, { prefix: polkadotChain.addressPrefix }),
          source: 'local',
        },
      ];

      const result = accountService.resolveWalletName({
        wallet,
        accounts: [derivedAccount],
        contacts,
        identities: emptyIdentities,
        chains,
      });

      expect(result).toBe('My Vault Wallet');
    });
  });

  describe('resolveSelectedAccount', () => {
    const registerAvailability = () => {
      accountService.accountAvailabilityOnChainAnyOf.registerHandler({
        body: ({ account, chain }) =>
          accountService.isChainAccount(account) ? account.chainId === chain.chainId : true,
        available: () => true,
      });
    };

    const makeChainAccount = (overrides: Partial<ChainAccount>): ChainAccount => ({
      id: 'acc',
      type: 'chain',
      accountId: createAccountId('1'),
      chainId: polkadotChainId,
      name: '',
      walletId: 1,
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      createdAt: Date.now(),
      ...overrides,
    });

    it('resolves the account matching the selected address, not the first wallet account', () => {
      registerAvailability();
      const keyA = makeChainAccount({ id: 'a', accountId: createAccountId('10') });
      const keyB = makeChainAccount({ id: 'b', accountId: createAccountId('11') });

      const result = accountService.resolveSelectedAccount([keyA, keyB], {
        walletId: 1,
        address: toAddress(keyB.accountId),
        chain: polkadotChain,
      });

      expect(result).toEqual(keyB);
    });

    it('ignores accounts of other wallets sharing the address', () => {
      registerAvailability();
      const foreign = makeChainAccount({ id: 'foreign', walletId: 2 });
      const own = makeChainAccount({ id: 'own', walletId: 1 });

      const result = accountService.resolveSelectedAccount([foreign, own], {
        walletId: 1,
        address: toAddress(own.accountId),
        chain: polkadotChain,
      });

      expect(result).toEqual(own);
    });

    it('prefers the chain-scoped key when the wallet has several accounts with the same accountId', () => {
      registerAvailability();
      const universal: UniversalAccount = {
        id: 'u',
        type: 'universal',
        accountId: createAccountId('1'),
        name: '',
        walletId: 1,
        signingType: SigningType.POLKADOT_VAULT,
        cryptoType: CryptoType.SR25519,
        createdAt: Date.now(),
      };
      const chainKey = makeChainAccount({ id: 'c', accountId: createAccountId('1') });

      const result = accountService.resolveSelectedAccount([universal, chainKey], {
        walletId: 1,
        address: toAddress(chainKey.accountId),
        chain: polkadotChain,
      });

      expect(result).toEqual(chainKey);
    });

    it('returns null when the selected key is not available on the chain', () => {
      registerAvailability();
      const kusamaKey = makeChainAccount({ id: 'k', chainId: kusamaChainId });

      const result = accountService.resolveSelectedAccount([kusamaKey], {
        walletId: 1,
        address: toAddress(kusamaKey.accountId),
        chain: polkadotChain,
      });

      expect(result).toBeNull();
    });

    it('returns null for an empty address', () => {
      registerAvailability();
      const result = accountService.resolveSelectedAccount([makeChainAccount({})], {
        walletId: 1,
        address: '',
        chain: polkadotChain,
      });

      expect(result).toBeNull();
    });
  });

  describe('searchAccounts', () => {
    const createSearchAccount = (id: string, walletId: number, name: string): AnyAccount => ({
      id,
      walletId,
      name,
      type: 'chain',
      chainId: polkadotChainId,
      accountId: createAccountId(`search account ${id}`),
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.POLKADOT_VAULT,
      createdAt: Date.now(),
    });

    // Raw account names (stored key names) differ from resolved names shown in UI
    const vaultAccount = createSearchAccount('search-1', 1, 'FINOPS_PTL_JUL26_SCHEFFLER');
    const otherAccount = createSearchAccount('search-2', 2, 'Some other account');

    const searchableAccounts = [vaultAccount, otherAccount];

    // Resolved names — what the list actually displays
    const resolvedAccounts = [
      { id: vaultAccount.id, name: 'FINOPS_DOT_PTL_JUL26_SCHEFFLER' },
      { id: otherAccount.id, name: 'Some other account' },
    ];

    const resolvedWallets = [
      { id: 1, name: 'PTL Keys' },
      { id: 2, name: 'Other Wallet' },
    ];

    const search = (query: string, addressPrefix = 0) => {
      return accountService.searchAccounts({
        accounts: searchableAccounts,
        query,
        resolvedAccounts,
        resolvedWallets,
        addressPrefix,
      });
    };

    it('should return all accounts for empty query', () => {
      expect(search('')).toEqual(searchableAccounts);
    });

    it('should find account by resolved (displayed) name when it differs from raw name', () => {
      // raw name is "FINOPS_PTL_JUL26_SCHEFFLER", displayed name is "FINOPS_DOT_PTL_JUL26_SCHEFFLER"
      expect(search('FINOPS_D')).toEqual([vaultAccount]);
    });

    it('should find the only matching account when full displayed name is pasted', () => {
      expect(search('FINOPS_DOT_PTL_JUL26_SCHEFFLER')).toEqual([vaultAccount]);
    });

    it('should find account by displayed wallet name', () => {
      expect(search('PTL Keys')).toEqual([vaultAccount]);
    });

    it('should find account by displayed address', () => {
      const address = toAddress(vaultAccount.accountId, { prefix: 0 });

      expect(search(address.slice(0, 12))).toEqual([vaultAccount]);
    });

    it('should be case insensitive', () => {
      expect(search('finops_dot')).toEqual([vaultAccount]);
    });

    it('should return nothing when query matches neither names nor address', () => {
      expect(search('MISSING_QUERY')).toEqual([]);
    });

    it('should find account by its own resolved name when another wallet has the same accountId', () => {
      // Same mnemonic imported into two wallets — same accountId, different account.id
      const sharedAccountId = createAccountId('shared search account');
      const firstAccount = { ...createSearchAccount('dup-1', 1, 'raw first'), accountId: sharedAccountId };
      const secondAccount = { ...createSearchAccount('dup-2', 2, 'raw second'), accountId: sharedAccountId };

      const duplicateResolvedAccounts = [
        { id: firstAccount.id, name: 'First name' },
        { id: secondAccount.id, name: 'Second name' },
      ];

      // The list dedups by accountId keeping the first account, so its name is displayed
      const found = accountService.searchAccounts({
        accounts: [firstAccount],
        query: 'First name',
        resolvedAccounts: duplicateResolvedAccounts,
        resolvedWallets,
        addressPrefix: 0,
      });

      expect(found).toEqual([firstAccount]);
    });

    it('should fall back to raw account name when there is no resolved name', () => {
      const found = accountService.searchAccounts({
        accounts: searchableAccounts,
        query: 'FINOPS_PTL',
        resolvedAccounts: [],
        resolvedWallets: [],
        addressPrefix: 0,
      });

      expect(found).toEqual([vaultAccount]);
    });
  });
  describe('isWalletNameAutoGenerated', () => {
    const walletId = 42;
    const accountId = createAccountId('auto-named');
    const emptyContacts: Contact[] = [];
    const emptyIdentities: IdentityMap = {};

    const createMultisigWallet = (accountName: string, nameType: AccountNameType) => {
      const wallet = createSingleShardWallet(walletId, { rootAccountId: accountId, name: accountName });
      const account: UniversalAccount = {
        ...universalAccount,
        accountId,
        walletId,
        name: accountName,
        nameType,
      };

      return { wallet, accounts: [account] };
    };

    const check = (accountName: string, nameType: AccountNameType) => {
      const { wallet, accounts } = createMultisigWallet(accountName, nameType);

      return accountService.isWalletNameAutoGenerated({
        wallet,
        accounts,
        contacts: emptyContacts,
        identities: emptyIdentities,
      });
    };

    const shortOwn = (chunk: number, prefix?: number) => toShortAddress(toAddress(accountId, { prefix }), chunk);

    it('should treat a GENERATED name as auto-generated', () => {
      expect(check(shortOwn(5), AccountNameType.GENERATED)).toBe(true);
    });

    it('should treat a name the user typed as not auto-generated', () => {
      expect(check('Team treasury', AccountNameType.CUSTOM)).toBe(false);
    });

    it('should not treat a user name shaped like a shortened address as auto-generated', () => {
      expect(check('Team...Fund', AccountNameType.CUSTOM)).toBe(false);
      expect(check('Main...Vault', AccountNameType.CUSTOM)).toBe(false);
      expect(check('Ops...2024', AccountNameType.CUSTOM)).toBe(false);
      expect(check('Any for pure Foo...Bar', AccountNameType.CUSTOM)).toBe(false);
    });

    it('should not treat a shortening of a different address as auto-generated', () => {
      const other = toShortAddress(toAddress(createAccountId('someone-else')), 5);

      expect(check(other, AccountNameType.CUSTOM)).toBe(false);
      expect(check(`Any for pure ${other}`, AccountNameType.CUSTOM)).toBe(false);
    });

    // Storage migration 14 stamped CUSTOM onto every pre-existing account,
    // including multisigs that had only ever carried a derived name.
    it('should treat the shortened own address stamped CUSTOM as auto-generated', () => {
      expect(check(shortOwn(5), AccountNameType.CUSTOM)).toBe(true);
      expect(check(shortOwn(6), AccountNameType.CUSTOM)).toBe(true);
      expect(check(shortOwn(5, 42), AccountNameType.CUSTOM)).toBe(true);
      expect(check(shortOwn(6, 42), AccountNameType.CUSTOM)).toBe(true);
    });

    it('should use the chain prefix of a chain account when regenerating the name', () => {
      const wallet = createSingleShardWallet(walletId, { rootAccountId: accountId, name: 'x' });
      const name = shortOwn(5, kusamaChain.addressPrefix);
      const account: ChainAccount = {
        ...chainAccount,
        accountId,
        walletId,
        chainId: kusamaChainId,
        name,
        nameType: AccountNameType.CUSTOM,
      };

      const result = accountService.isWalletNameAutoGenerated({
        wallet,
        accounts: [account],
        contacts: emptyContacts,
        identities: emptyIdentities,
        chains: { [kusamaChainId]: kusamaChain },
      });

      expect(result).toBe(true);
    });

    it('should treat a proxy name stamped CUSTOM as auto-generated', () => {
      expect(check(`Any for pure ${shortOwn(5)}`, AccountNameType.CUSTOM)).toBe(true);
      expect(check(`Any for pure ${toShortAddress(accountId, 5)}`, AccountNameType.CUSTOM)).toBe(true);
      expect(check(`Staking for pure ${shortOwn(6)}`, AccountNameType.CUSTOM)).toBe(true);
      expect(check(`Any for ${shortOwn(6)}`, AccountNameType.CUSTOM)).toBe(true);
    });

    it('should not mistake a user name that merely contains an ellipsis', () => {
      expect(check('Savings... and more', AccountNameType.CUSTOM)).toBe(false);
      expect(check('for pure profit', AccountNameType.CUSTOM)).toBe(false);
    });

    it('should treat a wallet with a contact as not auto-generated', () => {
      const { wallet, accounts } = createMultisigWallet(shortOwn(5), AccountNameType.GENERATED);

      const result = accountService.isWalletNameAutoGenerated({
        wallet,
        accounts,
        contacts: [
          {
            id: 'contact-auto-named',
            accountId,
            name: 'my multisig',
            address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
            source: 'local',
          },
        ],
        identities: emptyIdentities,
      });

      expect(result).toBe(false);
    });
  });
});
