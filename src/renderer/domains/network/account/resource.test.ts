import { describe, expect, it } from 'vitest';

import { CryptoType, SigningType } from '@/shared/core';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';

import { accountsNameResource, createAccountNameCacheKey } from './resource';
import { type ChainAccount } from './types';

describe('createAccountNameCacheKey', () => {
  it('should key on the specific account id, not just accountId, so accounts sharing an accountId across wallets do not collide', () => {
    const sharedAccountId = createAccountId('shared');

    const vaultDerivedAccount: ChainAccount = {
      id: 'vault-account',
      type: 'chain',
      accountId: sharedAccountId,
      chainId: polkadotChainId,
      name: '//polkadot//0',
      walletId: 1,
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      createdAt: Date.now(),
    };
    const watchOnlyAccount: ChainAccount = {
      ...vaultDerivedAccount,
      id: 'watch-only-account',
      walletId: 2,
      name: 'My Watch-Only',
    };

    const vaultKey = createAccountNameCacheKey({
      accountId: sharedAccountId,
      chain: polkadotChain,
      account: vaultDerivedAccount,
    });
    const watchOnlyKey = createAccountNameCacheKey({
      accountId: sharedAccountId,
      chain: polkadotChain,
      account: watchOnlyAccount,
    });

    expect(vaultKey).not.toBe(watchOnlyKey);
  });

  it('should fall back to accountId when no specific account is known (e.g. an arbitrary address)', () => {
    const accountId = createAccountId('arbitrary');

    const key = createAccountNameCacheKey({ accountId, chain: polkadotChain });

    expect(key).toBe(`${accountId}:${polkadotChainId}:${polkadotChain.addressPrefix}:`);
  });
});

describe('accountsNameResource.createKey', () => {
  it('should not collide for two different account lists that share an accountId across wallets', () => {
    const sharedAccountId = createAccountId('shared');

    const vaultDerivedAccount: ChainAccount = {
      id: 'vault-account',
      type: 'chain',
      accountId: sharedAccountId,
      chainId: polkadotChainId,
      name: '//polkadot//0',
      walletId: 1,
      signingType: SigningType.POLKADOT_VAULT,
      cryptoType: CryptoType.SR25519,
      createdAt: Date.now(),
    };
    const watchOnlyAccount: ChainAccount = {
      ...vaultDerivedAccount,
      id: 'watch-only-account',
      walletId: 2,
      name: 'My Watch-Only',
    };

    // Same accountId set (just the one, shared, address) requested from two
    // different account lists — a resource-key collision here would make the
    // second request reuse the first's cached response wholesale.
    const firstListKey = accountsNameResource.createKey({ accounts: [vaultDerivedAccount], chain: polkadotChain });
    const secondListKey = accountsNameResource.createKey({ accounts: [watchOnlyAccount], chain: polkadotChain });

    expect(firstListKey).not.toBe(secondListKey);
  });
});
