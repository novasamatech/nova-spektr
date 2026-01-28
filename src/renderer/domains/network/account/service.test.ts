import { afterEach, describe, expect, it } from 'vitest';

import { AccountNameType, type Chain, type Contact, CryptoType, SigningType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import {
  createAccountId,
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
};

const universalAccount: UniversalAccount = {
  id: 'universal',
  type: 'universal',
  accountId: createAccountId('3'),
  name: '',
  walletId: 0,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
};

describe('account service', () => {
  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
    accountService.accountCanSignMultipleAnyOf.resetHandlers();
    accountService.accountCollectChildrenPipeline.resetHandlers();
    accountService.accountConnectionCountTransformer.resetHandlers();
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
        id: 'first-proxy',
        type: 'chain',
        name: 'test',
        walletId: 0,
        chainId: polkadotChainId,
        accountId: createAccountId('1'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WALLET_CONNECT,
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
        signingType: SigningType.WALLET_CONNECT,
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

      const firstProxyNode = graphs.get(firstProxyAccount.id);
      const secondProxyNode = graphs.get(secondProxyAccount.id);
      const childNode = graphs.get(leafAccount.id);

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
        id: 'proxy-1',
        type: 'chain',
        name: 'test',
        walletId: 1,
        chainId: polkadotChainId,
        accountId: createAccountId('2'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WALLET_CONNECT,
        proxiedAccountId: createAccountId('3'),
      };

      const extensionAccount: ChainAccount = {
        id: 'ext-1',
        type: 'chain',
        name: 'test',
        walletId: 2,
        chainId: polkadotChainId,
        accountId: createAccountId('3'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.EXTENSION,
      };

      const wcAccount: ChainAccount = {
        id: 'wc-1',
        type: 'chain',
        name: 'test',
        walletId: 3,
        chainId: polkadotChainId,
        accountId: createAccountId('3'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WALLET_CONNECT,
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
        id: 'proxy-2',
        type: 'chain',
        name: 'test',
        walletId: 1,
        chainId: polkadotChainId,
        accountId: createAccountId('2'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.WALLET_CONNECT,
        proxiedAccountId: createAccountId('3'),
      };

      const pvAccount: ChainAccount = {
        id: 'pv-1',
        type: 'chain',
        name: 'test',
        walletId: 2,
        chainId: polkadotChainId,
        accountId: createAccountId('3'),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
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
          id: 1,
          accountId,
          name: 'Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
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
          id: 1,
          accountId,
          name: 'Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
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
          id: 1,
          accountId,
          name: 'Contact Name',
          address: toAddress(accountId, { prefix: polkadotChain.addressPrefix }),
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
  });
});
