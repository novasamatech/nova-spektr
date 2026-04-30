// @ts-nocheck - Test file; mocks don't satisfy strict types
import { allSettled, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/pallet/proxy', () => ({
  proxyPallet: {
    storage: {
      proxies: vi.fn(),
    },
    consts: {},
    schema: {},
  },
}));

vi.mock('@/shared/api/storage', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    storageService: {
      ...(actual as any).storageService,
      wallets: { deleteAll: vi.fn().mockResolvedValue([]) },
      accounts: { deleteAll: vi.fn().mockResolvedValue([]) },
      proxies: { createAll: vi.fn().mockResolvedValue([]) },
    },
  };
});

import { proxyPallet } from '@/shared/pallet/proxy';
import { walletModel } from '@/entities/wallet';

import {
  allAccounts,
  multisigAccount1,
  proxiedAccount1,
  proxiedAccount2,
  proxiedAccount3,
  userAccount,
} from './__mocks__/sync.proxied.mocks';
import { sync } from './sync';

const { verifyProxiedDeletionFx } = sync.__test;

const CHAIN_ID = '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42' as const;
const FOREIGN_DELEGATE = '0xabcdef0000000000000000000000000000000000000000000000000000000000';

const buildMockApi = () => ({}) as any;

const noProxiesResult = (accountIds: string[]) =>
  accountIds.map((account) => ({ account, value: { proxies: [], deposit: '0' } }));

// On-chain proxies whose delegate IS a local account (the user can still sign).
// Models the indexer-lag scenario: indexer dropped the entry, on-chain still has it.
const hasLocalDelegateResult = (accountIds: string[]) =>
  accountIds.map((account) => ({
    account,
    value: {
      proxies: [{ delegate: userAccount.accountId, proxyType: 'Any', delay: 0 }],
      deposit: '1002050000000',
    },
  }));

// On-chain proxies that exist but whose delegate is NOT a local account.
// Models a proxied where someone else still has authority but we don't —
// we have no signing source so the local wallet should be removed.
const hasForeignDelegateResult = (accountIds: string[]) =>
  accountIds.map((account) => ({
    account,
    value: {
      proxies: [{ delegate: FOREIGN_DELEGATE, proxyType: 'Any', delay: 0 }],
      deposit: '1002050000000',
    },
  }));

describe('verifyProxiedDeletionFx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array immediately when candidateWalletIds is empty', async () => {
    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [],
      allAccounts,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([]);
    expect(proxyPallet.storage.proxies).not.toHaveBeenCalled();
  });

  it('returns wallet ID when on-chain proxies list is empty', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(noProxiesResult([proxiedAccount1.accountId]));

    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId],
      allAccounts,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([proxiedAccount1.walletId]);
  });

  it('does not return wallet ID when a local account is still a delegate (indexer lag)', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(hasLocalDelegateResult([proxiedAccount1.accountId]));

    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId],
      allAccounts,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([]);
  });

  it('returns wallet ID when on-chain delegates exist but none is a local account', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(hasForeignDelegateResult([proxiedAccount1.accountId]));

    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId],
      allAccounts,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([proxiedAccount1.walletId]);
  });

  it('does not return wallet ID when API throws — conservative error handling', async () => {
    proxyPallet.storage.proxies.mockRejectedValueOnce(new Error('RPC timeout'));

    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId],
      allAccounts,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([]);
  });

  it('does not return wallet ID when no API is connected for the chain — conservative', async () => {
    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId],
      allAccounts,
      apis: {},
    });

    expect(result).toEqual([]);
    expect(proxyPallet.storage.proxies).not.toHaveBeenCalled();
  });

  it('partitions mixed results by local-source presence among on-chain delegates', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce([
      // proxiedAccount1: empty on-chain → no local source → delete
      { account: proxiedAccount1.accountId, value: { proxies: [], deposit: '0' } },
      // proxiedAccount2: a local account is still a delegate → keep
      {
        account: proxiedAccount2.accountId,
        value: {
          proxies: [{ delegate: userAccount.accountId, proxyType: 'Any', delay: 0 }],
          deposit: '1',
        },
      },
    ]);

    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId, proxiedAccount2.walletId],
      allAccounts,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toContain(proxiedAccount1.walletId);
    expect(result).not.toContain(proxiedAccount2.walletId);
  });

  it('deletes proxied delegated by a multisig that has been excluded from allAccounts', async () => {
    // Models the user-removes-signer scenario: the multisig is doomed in this
    // sync iteration, so the caller passes accountsAfterImmediate WITHOUT the
    // multisig. proxiedAccount2 is delegated by multisigAccount1 on-chain.
    // verify must see "no live delegate" and confirm deletion.
    const accountsAfterImmediate = allAccounts.filter((a) => a.accountId !== multisigAccount1.accountId);

    proxyPallet.storage.proxies.mockResolvedValueOnce([
      {
        account: proxiedAccount2.accountId,
        value: {
          proxies: [{ delegate: multisigAccount1.accountId, proxyType: 'Any', delay: 0 }],
          deposit: '1',
        },
      },
    ]);

    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount2.walletId],
      allAccounts: accountsAfterImmediate,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([proxiedAccount2.walletId]);
  });

  it('falls back to original wallet IDs when no matching proxied accounts found', async () => {
    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [999],
      allAccounts: [],
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([999]);
  });
});

describe('verifyProxiedDeletionFx → walletModel.walletsRemoved (Effector graph)', () => {
  let walletsRemovedMock: ReturnType<typeof vi.fn>;
  let scope: ReturnType<typeof fork>;

  beforeEach(() => {
    vi.clearAllMocks();
    walletsRemovedMock = vi.fn().mockResolvedValue(undefined);
    // walletsRemoved is attach({ source: $allWallets, effect }) — mock is called as (allWallets, walletIds)
    scope = fork({ handlers: new Map().set(walletModel.walletsRemoved, walletsRemovedMock) });
  });

  it('triggers walletsRemoved with confirmed-deleted wallet IDs', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(noProxiesResult([proxiedAccount1.accountId]));

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: { candidateWalletIds: [proxiedAccount1.walletId], allAccounts, apis: { [CHAIN_ID]: buildMockApi() } },
    });

    expect(walletsRemovedMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([proxiedAccount1.walletId]),
    );
  });

  it('triggers walletsRemoved with empty array when a local account is still a delegate (indexer lag)', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(hasLocalDelegateResult([proxiedAccount1.accountId]));

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: { candidateWalletIds: [proxiedAccount1.walletId], allAccounts, apis: { [CHAIN_ID]: buildMockApi() } },
    });

    expect(walletsRemovedMock).toHaveBeenCalledWith(expect.anything(), []);
  });

  it('triggers walletsRemoved when on-chain has only foreign delegates (we lost authority)', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(hasForeignDelegateResult([proxiedAccount1.accountId]));

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: { candidateWalletIds: [proxiedAccount1.walletId], allAccounts, apis: { [CHAIN_ID]: buildMockApi() } },
    });

    expect(walletsRemovedMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([proxiedAccount1.walletId]),
    );
  });

  it('triggers walletsRemoved with empty array when API throws', async () => {
    proxyPallet.storage.proxies.mockRejectedValueOnce(new Error('Network error'));

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: { candidateWalletIds: [proxiedAccount1.walletId], allAccounts, apis: { [CHAIN_ID]: buildMockApi() } },
    });

    expect(walletsRemovedMock).toHaveBeenCalledWith(expect.anything(), []);
  });

  it('triggers walletsRemoved with empty array when no API is connected', async () => {
    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: { candidateWalletIds: [proxiedAccount1.walletId], allAccounts, apis: {} },
    });

    expect(walletsRemovedMock).toHaveBeenCalledWith(expect.anything(), []);
    expect(proxyPallet.storage.proxies).not.toHaveBeenCalled();
  });

  it('triggers walletsRemoved with all three wallet IDs when all confirmed absent on-chain', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(
      noProxiesResult([proxiedAccount1.accountId, proxiedAccount2.accountId, proxiedAccount3.accountId]),
    );

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: {
        candidateWalletIds: [proxiedAccount1.walletId, proxiedAccount2.walletId, proxiedAccount3.walletId],
        allAccounts,
        apis: { [CHAIN_ID]: buildMockApi() },
      },
    });

    expect(walletsRemovedMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([proxiedAccount1.walletId, proxiedAccount2.walletId, proxiedAccount3.walletId]),
    );
  });
});
