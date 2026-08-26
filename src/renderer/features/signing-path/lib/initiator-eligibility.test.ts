import { describe, expect, it, vi } from 'vitest';

import { type Wallet, SigningType, WalletType } from '@/shared/core';
import { createAccountId, createPolkadotWallet, createVaultBaseAccount, polkadotAssetHubChain } from '@/shared/mocks';

// Chain availability is a DI `anyOf` registry that a unit test boots empty —
// stand in a rule that lets the "off-chain" fixture stay unavailable.
vi.mock('@/domains/network/account/service', async (importOriginal) => {
  const actual = await importOriginal<{ accountService: Record<string, unknown> }>();

  return {
    ...actual,
    accountService: {
      ...actual.accountService,
      isAccountAvailableOnChain: (account: { name: string }) => account.name !== 'off-chain',
    },
  };
});

const { isEligibleInitiator } = await import('./initiator-eligibility');

const KEY = createAccountId('key');
const vaultWallet = createPolkadotWallet(1, { rootAccountId: KEY });
const watchWallet: Wallet = { id: 2, name: 'Watch only', type: WalletType.WATCH_ONLY, accounts: [] };
const key = createVaultBaseAccount('key', { walletId: 1, accountId: KEY });

describe('isEligibleInitiator', () => {
  it('accepts a signing key on the chain in a wallet that may stake', () => {
    expect(isEligibleInitiator(key, vaultWallet, polkadotAssetHubChain)).toBe(true);
  });

  it('rejects a watch-only key', () => {
    const watched = { ...key, signingType: SigningType.WATCH_ONLY };

    expect(isEligibleInitiator(watched, vaultWallet, polkadotAssetHubChain)).toBe(false);
  });

  it('rejects a key the chain cannot hold', () => {
    expect(isEligibleInitiator({ ...key, name: 'off-chain' }, vaultWallet, polkadotAssetHubChain)).toBe(false);
  });

  it('rejects a key whose wallet may not stake, and a key with no wallet', () => {
    expect(isEligibleInitiator(key, watchWallet, polkadotAssetHubChain)).toBe(false);
    expect(isEligibleInitiator(key, null, polkadotAssetHubChain)).toBe(false);
  });
});
