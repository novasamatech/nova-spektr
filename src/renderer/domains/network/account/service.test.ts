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
import { toAddress } from '@/shared/lib/utils';
import {
  createAccountId,
  createPolkadotWallet,
  createSingleShardWallet,
  kusamaChain,
  kusamaChainId,
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
  ...overrides,
});

describe('account service', () => {
  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
    accountService.accountCanSignMultipleAnyOf.resetHandlers();
    accountService.accountCollectChildrenPipeline.resetHandlers();
  });

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

    const chains: Record<string, Chain> = {
      [polkadotChainId]: polkadotChain,
      [kusamaChainId]: kusamaChain,
    };

    const registerHandlers = () => {
      accountService.accountAvailabilityOnChainAnyOf.registerHandler({
        body: ({ account, chain }) =>
          accountService.isChainAccount(account) ? account.chainId === chain.chainId : true,
        available: () => true,
      });
      // a "signable" leaf is a Polkadot Vault key; derived accounts are watch-only
      accountService.accountActionPermissionAnyOf.registerHandler({
        body: ({ account }) => account.signingType === SigningType.POLKADOT_VAULT,
        available: () => true,
      });
      accountService.accountCollectChildrenPipeline.registerHandler({
        body(children, { account, accounts }) {
          if (isTestProxied(account)) {
            return accounts
              .filter(a => account.connections.some(c => c.proxyAccountId === a.accountId))
              .concat(children);
          }
          if (isTestMultisig(account)) {
            return accounts.filter(a => account.signatories.some(s => s.accountId === a.accountId)).concat(children);
          }
          return children;
        },
        available: () => true,
      });
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

    it('should return short address if no contact or identity', () => {
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
});
