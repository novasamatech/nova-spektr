import { describe, expect, it, vi } from 'vitest';

import { type Wallet, WalletType } from '@/shared/core';
import { createAccountId, createPolkadotWallet, createVaultBaseAccount, polkadotAssetHubChain } from '@/shared/mocks';

vi.mock('@/domains/network/account/service', async (importOriginal) => {
  const actual = await importOriginal<{ accountService: Record<string, unknown> }>();

  return { ...actual, accountService: { ...actual.accountService, isAccountAvailableOnChain: () => true } };
});

const { pickDefaultInitiator } = await import('./pick-default-initiator');

const a = createVaultBaseAccount('a', { walletId: 1, accountId: createAccountId('a') });
const b = createVaultBaseAccount('b', { walletId: 2, accountId: createAccountId('b') });
const w = createVaultBaseAccount('w', { walletId: 3, accountId: createAccountId('w') });
const walletA = createPolkadotWallet(1, { rootAccountId: a.accountId });
const walletB = createPolkadotWallet(2, { rootAccountId: b.accountId });
// Signable on paper, yet its wallet may not act — a watch-only wallet is never
// offered, whatever its accounts say.
const watch: Wallet = { id: 3, name: 'Watch only', type: WalletType.WATCH_ONLY, accounts: [] };

const chain = polkadotAssetHubChain;
const sources = { accounts: [w, a, b], wallets: [walletA, walletB, watch], selectedWalletId: 2 };

describe('pickDefaultInitiator', () => {
  it('takes the first preferred account that is eligible', () => {
    expect(pickDefaultInitiator({ preferred: [w.accountId, a.accountId], chain, ...sources })).toEqual({
      account: a,
      wallet: walletA,
    });
  });

  it('falls back to the selected wallet', () => {
    expect(pickDefaultInitiator({ preferred: [w.accountId], chain, ...sources })).toEqual({
      account: b,
      wallet: walletB,
    });
  });

  it('falls back to the first eligible account when the selected wallet has none', () => {
    expect(pickDefaultInitiator({ preferred: [], chain, ...sources, selectedWalletId: 3 })).toEqual({
      account: a,
      wallet: walletA,
    });
  });

  it('is null when nothing is eligible', () => {
    expect(
      pickDefaultInitiator({ preferred: [], chain, accounts: [w], wallets: [watch], selectedWalletId: null }),
    ).toBeNull();
  });
});
