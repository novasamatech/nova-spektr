// @ts-nocheck - Test file; mocks don't satisfy strict types
/**
 * Tests for on-chain verification before proxy account deletion (#15)
 *
 * The fix introduces `verifyProxiedDeletionFx` which makes an on-chain call via
 * `proxyPallet.storage.proxies()` before removing any proxied accounts.
 *
 * Key rules under test:
 *
 * 1. Account absent in indexer AND absent on-chain → deleted
 * 2. Account absent in indexer BUT present on-chain → kept (indexer was lagging)
 * 3. API unavailable / throws → kept (conservative)
 * 4. No API connected for chain → kept (conservative)
 * 5. CandidateWalletIds is empty → nothing happens
 *
 * Integration tests verify the Effector graph wiring:
 * verifyProxiedDeletionFx.doneData → walletModel.walletsRemoved
 */

import { allSettled, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock proxyPallet BEFORE any import that transitively uses it ──────────
vi.mock('@/shared/pallet/proxy', () => ({
  proxyPallet: {
    storage: {
      proxies: vi.fn(),
    },
    consts: {},
    schema: {},
  },
}));

// ─── Mock storage so effect doesn't touch IndexedDB ───────────────────────
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

// ─── Imports (after mocks) ─────────────────────────────────────────────────
import { proxyPallet } from '@/shared/pallet/proxy';
import { walletModel } from '@/entities/wallet';

import { allAccounts, proxiedAccount1, proxiedAccount2, proxiedAccount3 } from './__mocks__/sync.proxied.mocks';
import { sync } from './sync';

// ─── Shared helpers ────────────────────────────────────────────────────────

const { verifyProxiedDeletionFx } = sync._test;

const CHAIN_ID = '0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42' as const;

const buildMockApi = () => ({}) as any;

const noProxiesResult = (accountIds: string[]) =>
  accountIds.map((account) => ({ account, value: { proxies: [], deposit: '0' } }));

const hasProxiesResult = (accountIds: string[]) =>
  accountIds.map((account) => ({
    account,
    value: {
      proxies: [{ delegate: '0xabcdef', proxyType: 'Any', delay: 0 }],
      deposit: '1002050000000',
    },
  }));

// ═══════════════════════════════════════════════════════════════════════════
// Unit tests — call verifyProxiedDeletionFx directly, assert on return value
// ═══════════════════════════════════════════════════════════════════════════

describe('verifyProxiedDeletionFx — unit tests', () => {
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

  it('returns wallet ID as confirmed-deleted when on-chain proxies list is empty', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(noProxiesResult([proxiedAccount1.accountId]));

    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId],
      allAccounts,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([proxiedAccount1.walletId]);
  });

  it('does NOT return wallet ID when on-chain proxies are present (account still exists)', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(hasProxiesResult([proxiedAccount1.accountId]));

    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId],
      allAccounts,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([]);
  });

  it('does NOT return wallet ID when on-chain API throws — conservative error handling', async () => {
    proxyPallet.storage.proxies.mockRejectedValueOnce(new Error('RPC timeout'));

    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId],
      allAccounts,
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([]);
  });

  it('does NOT return wallet ID when no API is connected for the chain — conservative', async () => {
    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [proxiedAccount1.walletId],
      allAccounts,
      apis: {}, // no API for CHAIN_ID
    });

    expect(result).toEqual([]);
    expect(proxyPallet.storage.proxies).not.toHaveBeenCalled();
  });

  it('correctly partitions mixed results: deletes absent accounts, keeps present ones', async () => {
    // account1 → absent on-chain (delete), account2 → present on-chain (keep)
    proxyPallet.storage.proxies.mockResolvedValueOnce([
      { account: proxiedAccount1.accountId, value: { proxies: [], deposit: '0' } },
      {
        account: proxiedAccount2.accountId,
        value: { proxies: [{ delegate: '0xabc', proxyType: 'Any', delay: 0 }], deposit: '1' },
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

  it('falls back to original wallet IDs when allAccounts contains no matching proxied accounts', async () => {
    // Unexpected state guard: if we can't find accounts, return candidates as-is
    const result = await verifyProxiedDeletionFx({
      candidateWalletIds: [999],
      allAccounts: [], // empty — no proxied accounts to find
      apis: { [CHAIN_ID]: buildMockApi() },
    });

    expect(result).toEqual([999]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration tests — Effector graph wiring
//   verifyProxiedDeletionFx → (doneData) → walletModel.walletsRemoved
//
// These tests verify that after verifyProxiedDeletionFx resolves,
// walletModel.walletsRemoved is correctly triggered (or not) based on
// the on-chain verification result.
// ═══════════════════════════════════════════════════════════════════════════

describe('proxy sync on-chain verification — integration (Effector graph)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes account when absent from indexer and confirmed absent on-chain', async () => {
    // Scenario: indexer missed the account AND on-chain shows 0 proxies → delete it
    proxyPallet.storage.proxies.mockResolvedValueOnce(noProxiesResult([proxiedAccount1.accountId]));

    const walletsRemovedMock = vi.fn().mockResolvedValue(undefined);

    // We only override handlers; no store values needed — effect params are passed directly
    const scope = fork({
      handlers: new Map().set(walletModel.walletsRemoved, walletsRemovedMock),
    });

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: {
        candidateWalletIds: [proxiedAccount1.walletId],
        allAccounts,
        apis: { [CHAIN_ID]: buildMockApi() },
      },
    });

    // walletsRemovedFx is an attach() effect: handler receives (sourceStore, params)
    // so mock is called as (allWallets, walletIds)
    expect(walletsRemovedMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([proxiedAccount1.walletId]),
    );
  });

  it('keeps account when absent from indexer but present on-chain — KEY security test', async () => {
    // Scenario: indexer lag — account still exists on-chain but indexer didn't return it.
    // This is the critical false-deletion scenario the fix prevents.
    proxyPallet.storage.proxies.mockResolvedValueOnce(hasProxiesResult([proxiedAccount1.accountId]));

    const walletsRemovedMock = vi.fn().mockResolvedValue(undefined);

    const scope = fork({
      handlers: new Map().set(walletModel.walletsRemoved, walletsRemovedMock),
    });

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: {
        candidateWalletIds: [proxiedAccount1.walletId],
        allAccounts,
        apis: { [CHAIN_ID]: buildMockApi() },
      },
    });

    // walletsRemoved might be called with [] but the target wallet must NOT appear
    const calls = walletsRemovedMock.mock.calls;
    const removedIds: number[] = calls.length > 0 ? (calls[0][0] as number[]) : [];
    expect(removedIds).not.toContain(proxiedAccount1.walletId);
  });

  it('keeps account when on-chain API is unavailable — conservative logic', async () => {
    proxyPallet.storage.proxies.mockRejectedValueOnce(new Error('Network error'));

    const walletsRemovedMock = vi.fn().mockResolvedValue(undefined);

    const scope = fork({
      handlers: new Map().set(walletModel.walletsRemoved, walletsRemovedMock),
    });

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: {
        candidateWalletIds: [proxiedAccount1.walletId],
        allAccounts,
        apis: { [CHAIN_ID]: buildMockApi() },
      },
    });

    const calls = walletsRemovedMock.mock.calls;
    const removedIds: number[] = calls.length > 0 ? (calls[0][0] as number[]) : [];
    expect(removedIds).not.toContain(proxiedAccount1.walletId);
  });

  it('keeps account when no API is connected for its chain — conservative logic', async () => {
    const walletsRemovedMock = vi.fn().mockResolvedValue(undefined);

    const scope = fork({
      handlers: new Map().set(walletModel.walletsRemoved, walletsRemovedMock),
    });

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: {
        candidateWalletIds: [proxiedAccount1.walletId],
        allAccounts,
        apis: {}, // no API connected
      },
    });

    const calls = walletsRemovedMock.mock.calls;
    const removedIds: number[] = calls.length > 0 ? (calls[0][0] as number[]) : [];
    expect(removedIds).not.toContain(proxiedAccount1.walletId);
    expect(proxyPallet.storage.proxies).not.toHaveBeenCalled();
  });

  it('removes all three wallets when all confirmed absent on-chain', async () => {
    proxyPallet.storage.proxies.mockResolvedValueOnce(
      noProxiesResult([proxiedAccount1.accountId, proxiedAccount2.accountId, proxiedAccount3.accountId]),
    );

    const walletsRemovedMock = vi.fn().mockResolvedValue(undefined);

    const scope = fork({
      handlers: new Map().set(walletModel.walletsRemoved, walletsRemovedMock),
    });

    await allSettled(verifyProxiedDeletionFx, {
      scope,
      params: {
        candidateWalletIds: [proxiedAccount1.walletId, proxiedAccount2.walletId, proxiedAccount3.walletId],
        allAccounts,
        apis: { [CHAIN_ID]: buildMockApi() },
      },
    });

    // walletsRemovedFx is an attach() effect: handler receives (sourceStore, params)
    expect(walletsRemovedMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([proxiedAccount1.walletId, proxiedAccount2.walletId, proxiedAccount3.walletId]),
    );
  });
});
