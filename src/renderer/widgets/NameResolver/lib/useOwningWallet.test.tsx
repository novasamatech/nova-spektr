import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type Wallet, CryptoType, SigningType, WalletType } from '@/shared/core';
import { createAccountId, kusamaChain, kusamaChainId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AnyAccount, type ChainAccount, accountService } from '@/domains/network';

import { useOwningWallet } from './useOwningWallet';

// `accounts.$list` and `walletModel.$wallets` are derived (read-only) stores,
// so they cannot be seeded through `fork({ values })` — stub them with
// writable ones instead.
const stubs = await vi.hoisted(async () => {
  const { createEvent, createStore } = await import('effector');
  const seed = createEvent<{ accounts: AnyAccount[]; wallets: Wallet[] }>();
  const $accounts = createStore<AnyAccount[]>([]).on(seed, (_, { accounts }) => accounts);
  const $wallets = createStore<Wallet[]>([]).on(seed, (_, { wallets }) => wallets);

  return { seed, $accounts, $wallets };
});

vi.mock('@/domains/network', async (importOriginal) => ({
  ...(await importOriginal()),
  accounts: { $list: stubs.$accounts },
}));

vi.mock('@/entities/wallet', () => ({
  walletModel: { $wallets: stubs.$wallets },
}));

const sharedAccountId = createAccountId('shared');

const polkadotAccount: ChainAccount = {
  id: 'polkadot',
  type: 'chain',
  accountId: sharedAccountId,
  chainId: polkadotChainId,
  name: '',
  walletId: 1,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  createdAt: 0,
};

const kusamaAccount: ChainAccount = {
  ...polkadotAccount,
  id: 'kusama',
  chainId: kusamaChainId,
  walletId: 2,
};

const orphanAccount: ChainAccount = {
  ...polkadotAccount,
  id: 'orphan',
  accountId: createAccountId('orphan'),
  walletId: 99,
};

const wallets: Wallet[] = [
  { id: 1, name: 'Polkadot Wallet', type: WalletType.POLKADOT_VAULT, accounts: [] },
  { id: 2, name: 'Kusama Wallet', type: WalletType.POLKADOT_VAULT, accounts: [] },
];

stubs.seed({ accounts: [polkadotAccount, kusamaAccount, orphanAccount], wallets });

const renderOwningWallet = (...args: Parameters<typeof useOwningWallet>) =>
  renderHook(() => useOwningWallet(...args)).result.current;

describe('widgets/NameResolver/useOwningWallet', () => {
  it('should not scan the accounts when opted out with a null accountId', () => {
    const findRelatedAccount = vi.spyOn(accountService, 'findRelatedAccount');

    expect(renderOwningWallet(null, polkadotChain)).toBeNull();
    expect(findRelatedAccount).not.toHaveBeenCalled();

    findRelatedAccount.mockRestore();
  });

  it('should pick the chain-scoped account when several share the accountId', () => {
    expect(renderOwningWallet(sharedAccountId, polkadotChain)?.name).toBe('Polkadot Wallet');
    expect(renderOwningWallet(sharedAccountId, kusamaChain)?.name).toBe('Kusama Wallet');
  });

  it('should return null when the account belongs to no local wallet', () => {
    expect(renderOwningWallet(orphanAccount.accountId, polkadotChain)).toBeNull();
  });

  it('should return null for an account that is not local at all', () => {
    expect(renderOwningWallet(createAccountId('unknown'), polkadotChain)).toBeNull();
  });
});
