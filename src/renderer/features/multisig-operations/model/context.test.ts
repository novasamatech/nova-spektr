import { type Scope, allSettled, createWatch, fork, launch } from 'effector';
import { describe, expect, it, vi } from 'vitest';

// Mock components that cause circular dependency issues
vi.mock('../components/Operation', () => ({
  operationTitleTransformer: { createTransformer: () => {} },
}));

import { type MultisigAccount, AccountType, ProxyVariant, WalletType } from '@/shared/core';
import { createAccountId, kusamaChainId, polkadotChainId } from '@/shared/mocks';
import { accounts, multisigOperation } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { draftDeepLinkModel } from '@/features/drafts';

import { operationsContextModel } from './context';
import { deepLinkModel } from './deep-link';
import './draft-deep-link-expand';

describe('operations context model', () => {
  const mockAccountId = createAccountId(1);
  const mockProxiedAccountId = createAccountId(2);

  const mockMultisigAccount = {
    id: '1',
    walletId: 1,
    name: 'Test Multisig',
    accountId: mockAccountId,
    accountType: 'multisig',
    type: 'universal',
    cryptoType: 0,
    signingType: 'signing',
    signatories: [],
    threshold: 2,
    createdAt: 0,
  } as unknown as MultisigAccount;

  const createMockOperation = (status: 'pending' | 'executed' | 'cancelled' | 'error', callHash = '0xabc123') => {
    const operationId = `${polkadotChainId}-${callHash}-${mockAccountId}-100-1`;
    return {
      id: operationId,
      status,
      transaction: null,
      method: null,
      section: null,
      callHash: callHash as any,
      callData: null,
      chainId: polkadotChainId,
      multisigAccountId: mockAccountId,
      depositor: mockAccountId,
      blockCreated: 100 as any,
      indexCreated: 1,
      events: [],
      timestamp: Date.now(),
    };
  };

  const createMockProxiedOperation = (callHash = '0xproxy') => ({
    ...createMockOperation('pending', callHash),
    proxiedAccountId: mockProxiedAccountId,
  });

  const populateAccounts = (scope: Scope, accountList: unknown[]) => {
    return allSettled(accounts.__test.$list, {
      scope,
      params: accountList as never,
    });
  };

  const populateWallets = (scope: Scope, wallets: unknown[]) => {
    return allSettled(walletModel.__test.$rawWallets, {
      scope,
      params: wallets as never,
    });
  };

  describe('Tab switching based on focused operation', () => {
    it('should switch to pending tab when focused operation is pending', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$tab, 'history'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should switch to history tab when focused operation is executed', async () => {
      const mockOperation = createMockOperation('executed');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('history');
    });

    it('should switch to history tab when focused operation is cancelled', async () => {
      const mockOperation = createMockOperation('cancelled');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('history');
    });

    it('should switch to history tab when focused operation has error status', async () => {
      const mockOperation = createMockOperation('error');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('history');
    });

    it('should not change tab when focusedOperationId is null', async () => {
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: null,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should default to pending tab when operation is not found', async () => {
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [])
          .set(operationsContextModel.$tab, 'history'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: 'non-existent-operation-id',
      });

      // When operation is not found, defaults to 'pending' (operation may not be fetched yet)
      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should switch to hidden tab when focused operation is hidden', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, [mockOperation.id])
          .set(operationsContextModel.$tab, 'pending'),
      });

      await allSettled(deepLinkModel.$focusedOperationId, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('hidden');
    });
  });

  describe('Hidden operations', () => {
    it('should add operation to hidden list when hideOperation is called', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, []),
      });

      await allSettled(operationsContextModel.hideOperation, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$hiddenOperationIds)).toContain(mockOperation.id);
    });

    it('should remove operation from hidden list when unhideOperation is called', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, [mockOperation.id]),
      });

      await allSettled(operationsContextModel.unhideOperation, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$hiddenOperationIds)).not.toContain(mockOperation.id);
    });

    it('should not add duplicate operation to hidden list', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, [mockOperation.id]),
      });

      await allSettled(operationsContextModel.hideOperation, {
        scope,
        params: mockOperation.id,
      });

      const hiddenIds = scope.getState(operationsContextModel.$hiddenOperationIds);
      expect(hiddenIds.filter(id => id === mockOperation.id)).toHaveLength(1);
    });

    it('should exclude hidden operations from pending tab', async () => {
      const pendingOp1 = createMockOperation('pending', '0xabc');
      const pendingOp2 = createMockOperation('pending', '0xdef');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [pendingOp1, pendingOp2])
          .set(operationsContextModel.$hiddenOperationIds, [pendingOp1.id])
          .set(operationsContextModel.$tab, 'pending')
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      const filtered = scope.getState(operationsContextModel.$filteredOperations);
      expect(filtered).toHaveLength(1);
      expect(filtered?.[0]?.operation.id).toBe(pendingOp2.id);
    });

    it('should show only hidden operations in hidden tab', async () => {
      const pendingOp = createMockOperation('pending', '0xabc');
      const hiddenOp = createMockOperation('executed', '0xdef');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [pendingOp, hiddenOp])
          .set(operationsContextModel.$hiddenOperationIds, [hiddenOp.id])
          .set(operationsContextModel.$tab, 'hidden')
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      const filtered = scope.getState(operationsContextModel.$filteredOperations);
      expect(filtered).toHaveLength(1);
      expect(filtered?.[0]?.operation.id).toBe(hiddenOp.id);
    });

    it('should calculate hidden operations count correctly', async () => {
      const op1 = createMockOperation('pending', '0xabc');
      const op2 = createMockOperation('executed', '0xdef');
      const op3 = createMockOperation('pending', '0xghi');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [op1, op2, op3])
          .set(operationsContextModel.$hiddenOperationIds, [op1.id, op2.id])
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      const count = scope.getState(operationsContextModel.$hiddenOperationsCount);
      expect(count).toBe(2);
    });

    it('should auto-switch to pending tab when all operations are unhidden', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$hiddenOperationIds, [mockOperation.id])
          .set(operationsContextModel.$tab, 'hidden'),
      });

      await allSettled(operationsContextModel.unhideOperation, {
        scope,
        params: mockOperation.id,
      });

      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should calculate pending count excluding hidden operations', async () => {
      const pendingOp1 = createMockOperation('pending', '0xabc');
      const pendingOp2 = createMockOperation('pending', '0xdef');
      const executedOp = createMockOperation('executed', '0xghi');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [pendingOp1, pendingOp2, executedOp])
          .set(operationsContextModel.$hiddenOperationIds, [pendingOp1.id])
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      const pendingCount = scope.getState(operationsContextModel.$pendingOperationsCount);
      expect(pendingCount).toBe(1); // Only pendingOp2, since pendingOp1 is hidden
    });

    it('should resolve proxied regular multisig operations to the proxied source account', async () => {
      const proxiedOperation = createMockProxiedOperation();
      const proxiedAccount = {
        id: 'proxied-1',
        walletId: 2,
        name: 'Pure proxied',
        accountId: mockProxiedAccountId,
        accountType: AccountType.PROXIED,
        type: 'chain',
        chainId: polkadotChainId,
        cryptoType: 0,
        signingType: 'signing',
        createdAt: 0,
        connections: [{ proxyAccountId: mockAccountId, proxyType: 'Any', delay: 0 }],
        proxyVariant: ProxyVariant.PURE,
        deposit: '0',
        extrinsicIndex: 1,
        entropyBlockNumber: 1,
      };

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [proxiedOperation])
          .set(operationsContextModel.$tab, 'pending')
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount, proxiedAccount]);

      const filtered = scope.getState(operationsContextModel.$filteredOperations);
      const account = filtered[0]?.account;

      expect(filtered).toHaveLength(1);
      expect(account?.accountType).toBe(AccountType.FLEX_MULTISIG);
      if (account?.accountType !== AccountType.FLEX_MULTISIG) {
        throw new Error('Expected a flexible multisig display account');
      }
      expect(account.accountId).toBe(mockProxiedAccountId);
      expect(account.multisigAccountId).toBe(mockAccountId);
      expect(account.proxyType).toBe('Any');
    });

    it('should not rebuild filtered operations when unrelated accounts change', async () => {
      const proxiedOperation = createMockProxiedOperation();
      const proxiedAccount = {
        id: 'proxied-1',
        walletId: 2,
        name: 'Pure proxied',
        accountId: mockProxiedAccountId,
        accountType: AccountType.PROXIED,
        type: 'chain',
        chainId: polkadotChainId,
        cryptoType: 0,
        signingType: 'signing',
        createdAt: 0,
        connections: [{ proxyAccountId: mockAccountId, proxyType: 'Any', delay: 0 }],
        proxyVariant: ProxyVariant.PURE,
        deposit: '0',
        extrinsicIndex: 1,
        entropyBlockNumber: 1,
      };
      const regularAccount = {
        id: 'regular-1',
        walletId: 3,
        name: 'Regular',
        accountId: createAccountId(3),
        accountType: AccountType.CHAIN,
        type: 'chain',
        chainId: polkadotChainId,
        cryptoType: 0,
        signingType: 'signing',
        createdAt: 0,
      };

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [proxiedOperation])
          .set(operationsContextModel.$tab, 'pending')
          .set(accounts.__test.$populated, true),
      });
      await populateWallets(scope, [{ id: 1, name: 'Test Multisig Wallet', type: WalletType.MULTISIG }]);
      await populateAccounts(scope, [mockMultisigAccount, proxiedAccount, regularAccount]);
      const spy = vi.fn();
      createWatch({ unit: operationsContextModel.$filteredOperations.updates, fn: spy, scope });

      await populateAccounts(scope, [
        mockMultisigAccount,
        proxiedAccount,
        { ...regularAccount, name: 'Regular updated' },
      ]);

      expect(spy).not.toHaveBeenCalled();
    });

    it('applies an active search to newly arrived operations in the same tick', async () => {
      // $filteredOperations reads $operationsWithAccounts directly and via the
      // guarded $searchMatchedOperationIds. If those legs settled a tick apart, a
      // new operation would be filtered against a stale id set.
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [])
          .set(operationsContextModel.$tab, 'pending')
          .set(accounts.__test.$populated, true),
      });
      await populateWallets(scope, [{ id: 1, name: 'Test Multisig Wallet', type: WalletType.MULTISIG }]);
      await populateAccounts(scope, [mockMultisigAccount]);

      await allSettled(operationsContextModel.setFilter, { scope, params: { searchQuery: 'zzzz-no-match' } });
      expect(scope.getState(operationsContextModel.$filteredOperations)).toHaveLength(0);

      // A non-matching operation arrives: it must not leak through on the tick
      // before the ids are recomputed.
      await allSettled(multisigOperation.__test.$cachedOperations, {
        scope,
        params: [createMockOperation('pending')],
      });
      expect(scope.getState(operationsContextModel.$filteredOperations)).toHaveLength(0);

      await allSettled(operationsContextModel.setFilter, { scope, params: { searchQuery: '0xabc' } });
      expect(scope.getState(operationsContextModel.$filteredOperations)).toHaveLength(1);
    });
  });

  describe('Sort state', () => {
    it('should cycle through asc, desc and null on repeated sortToggled', async () => {
      const scope = fork();

      await allSettled(operationsContextModel.sortToggled, { scope, params: 'value' });
      expect(scope.getState(operationsContextModel.$sort)).toEqual({ by: 'value', direction: 'asc' });

      await allSettled(operationsContextModel.sortToggled, { scope, params: 'value' });
      expect(scope.getState(operationsContextModel.$sort)).toEqual({ by: 'value', direction: 'desc' });

      await allSettled(operationsContextModel.sortToggled, { scope, params: 'value' });
      expect(scope.getState(operationsContextModel.$sort)).toBeNull();
    });
  });

  describe('Collapsed sections', () => {
    it('should toggle collapsed state per section independently', async () => {
      const scope = fork();

      await allSettled(operationsContextModel.toggleSection, { scope, params: 'in_progress' });
      expect(scope.getState(operationsContextModel.$collapsedSections)).toEqual({ in_progress: true });

      await allSettled(operationsContextModel.toggleSection, { scope, params: 'completed' });
      expect(scope.getState(operationsContextModel.$collapsedSections)).toEqual({
        in_progress: true,
        completed: true,
      });

      await allSettled(operationsContextModel.toggleSection, { scope, params: 'in_progress' });
      expect(scope.getState(operationsContextModel.$collapsedSections)).toEqual({
        in_progress: false,
        completed: true,
      });
    });

    it('should expand the collapsed section of a deep-linked operation', async () => {
      const mockOperation = createMockOperation('pending');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [mockOperation])
          .set(operationsContextModel.$collapsedSections, { in_progress: true, completed: true }),
      });

      await allSettled(deepLinkModel.$focusedOperationId, { scope, params: mockOperation.id });

      expect(scope.getState(operationsContextModel.$collapsedSections)).toEqual({
        in_progress: false,
        completed: true,
      });
    });

    it('should keep collapsed sections untouched when deep-linked operation is not found', async () => {
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [])
          .set(operationsContextModel.$collapsedSections, { in_progress: true }),
      });

      await allSettled(deepLinkModel.$focusedOperationId, { scope, params: 'non-existent-operation-id' });

      expect(scope.getState(operationsContextModel.$collapsedSections)).toEqual({ in_progress: true });
    });

    it('should expand a collapsed Drafts group on a draft deep link and leave the other groups alone', async () => {
      const scope = fork({
        values: new Map().set(operationsContextModel.$collapsedSections, { drafts: true, completed: true }),
      });

      // `handler.triggered` is typed as a derived `Event`, so it is fired through `launch`.
      launch({ target: draftDeepLinkModel.handler.triggered, params: { draftId: 'draft-1' }, scope });
      await allSettled(scope);

      expect(scope.getState(operationsContextModel.$collapsedSections)).toEqual({ drafts: false, completed: true });
    });

    it('should not emit an update when expanding an already expanded group', async () => {
      const collapsed = { completed: true };
      const scope = fork({
        values: new Map().set(operationsContextModel.$collapsedSections, collapsed),
      });
      const spy = vi.fn();
      createWatch({ unit: operationsContextModel.$collapsedSections.updates, fn: spy, scope });

      await allSettled(operationsContextModel.expandSection, { scope, params: 'drafts' });

      expect(spy).not.toHaveBeenCalled();
      expect(scope.getState(operationsContextModel.$collapsedSections)).toBe(collapsed);
    });
  });

  describe('Chain syncing', () => {
    const chainA = polkadotChainId;
    const chainB = kusamaChainId;

    it('should never report syncing for a wallet without multisig accounts', async () => {
      const scope = fork({
        values: new Map().set(multisigOperation.__test.$expectedChainIds, [chainA]),
      });

      expect(scope.getState(operationsContextModel.$isChainSyncing)).toBe(false);
    });

    it('should report syncing (connecting) while no expected chain is known yet', async () => {
      const scope = fork({
        values: new Map().set(multisigOperation.__test.$expectedChainIds, []).set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      expect(scope.getState(operationsContextModel.$isChainSyncing)).toBe(true);
    });

    it('should report syncing until every expected chain has reported', async () => {
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$expectedChainIds, [chainA, chainB])
          .set(multisigOperation.__test.$fetchedChainIds, [chainA])
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      expect(scope.getState(operationsContextModel.$isChainSyncing)).toBe(true);

      await allSettled(multisigOperation.__test.$fetchedChainIds, { scope, params: [chainA, chainB] });

      expect(scope.getState(operationsContextModel.$isChainSyncing)).toBe(false);
    });

    it('should remember a closed toast until a new set of expected chains starts a sync cycle', async () => {
      const scope = fork({
        values: new Map().set(multisigOperation.__test.$expectedChainIds, []).set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      expect(scope.getState(operationsContextModel.$isSyncToastVisible)).toBe(true);

      await allSettled(operationsContextModel.syncToastDismissed, { scope });

      // Still syncing (offline: nothing ever reports), but the close is remembered.
      expect(scope.getState(operationsContextModel.$isChainSyncing)).toBe(true);
      expect(scope.getState(operationsContextModel.$isSyncToastDismissed)).toBe(true);
      expect(scope.getState(operationsContextModel.$isSyncToastVisible)).toBe(false);

      await allSettled(multisigOperation.__test.$expectedChainIds, { scope, params: [chainA] });

      expect(scope.getState(operationsContextModel.$isSyncToastDismissed)).toBe(false);
      expect(scope.getState(operationsContextModel.$isSyncToastVisible)).toBe(true);
    });
  });

  describe('Scope merged', () => {
    it('should be false for a pure search filter', async () => {
      const scope = fork();

      await allSettled(operationsContextModel.setFilter, { scope, params: { searchQuery: 'abc' } });

      expect(scope.getState(operationsContextModel.$isScopeMerged)).toBe(false);
    });

    it('should be true when a status filter is set', async () => {
      const scope = fork();

      await allSettled(operationsContextModel.setFilter, { scope, params: { status: ['completed'] } });

      expect(scope.getState(operationsContextModel.$isScopeMerged)).toBe(true);
    });

    it('should normalize the tab to pending when a non-search filter merges the scope from the hidden tab', async () => {
      const scope = fork({
        values: new Map().set(operationsContextModel.$tab, 'hidden'),
      });

      await allSettled(operationsContextModel.setFilter, { scope, params: { status: ['completed'] } });

      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should normalize the tab to pending when a non-search filter merges the scope from the history tab', async () => {
      const scope = fork({
        values: new Map().set(operationsContextModel.$tab, 'history'),
      });

      await allSettled(operationsContextModel.setFilter, { scope, params: { network: ['polkadot'] } });

      expect(scope.getState(operationsContextModel.$tab)).toBe('pending');
    });

    it('should not touch the tab when a pure search filter does not merge the scope', async () => {
      const scope = fork({
        values: new Map().set(operationsContextModel.$tab, 'history'),
      });

      await allSettled(operationsContextModel.setFilter, { scope, params: { searchQuery: 'abc' } });

      expect(scope.getState(operationsContextModel.$tab)).toBe('history');
    });
  });

  describe('Filters selected', () => {
    it('should be true when only a status filter is set', async () => {
      const scope = fork();

      await allSettled(operationsContextModel.setFilter, { scope, params: { status: ['completed'] } });

      expect(scope.getState(operationsContextModel.$isFiltersSelected)).toBe(true);
    });
  });

  describe('Sectioned operations', () => {
    it('should group operations into sections following SECTION_ORDER', async () => {
      const pendingOp = createMockOperation('pending', '0xabc');
      const executedOp = createMockOperation('executed', '0xdef');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [pendingOp, executedOp])
          .set(operationsContextModel.$tab, 'pending')
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);
      // Setting a status filter merges the scope, so both pending and completed operations
      // pass the tab filter and end up bucketed by section.
      await allSettled(operationsContextModel.setFilter, {
        scope,
        params: { status: ['in_progress', 'completed'] },
      });

      const sections = scope.getState(operationsContextModel.$sectionedOperations);

      expect(sections.map(s => s.section)).toEqual(['in_progress', 'completed']);
      expect(sections[0]?.items.map(i => i.operation.id)).toEqual([pendingOp.id]);
      expect(sections[1]?.items.map(i => i.operation.id)).toEqual([executedOp.id]);
    });

    it('should bucket hidden operations into a trailing hidden section in the merged scope', async () => {
      const pendingOp = createMockOperation('pending', '0xabc');
      const hiddenOp = createMockOperation('pending', '0xdef');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [pendingOp, hiddenOp])
          .set(operationsContextModel.$tab, 'pending')
          .set(operationsContextModel.$hiddenOperationIds, [hiddenOp.id])
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);
      await allSettled(operationsContextModel.setFilter, {
        scope,
        params: { status: ['in_progress', 'hidden'] },
      });

      const sections = scope.getState(operationsContextModel.$sectionedOperations);

      expect(sections.map(s => s.section)).toEqual(['in_progress', 'hidden']);
      expect(sections[0]?.items.map(i => i.operation.id)).toEqual([pendingOp.id]);
      expect(sections[1]?.items.map(i => i.operation.id)).toEqual([hiddenOp.id]);
    });

    it('should exclude hidden operations from the merged scope when hidden status is not selected', async () => {
      const pendingOp = createMockOperation('pending', '0xabc');
      const hiddenOp = createMockOperation('pending', '0xdef');

      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [pendingOp, hiddenOp])
          .set(operationsContextModel.$tab, 'pending')
          .set(operationsContextModel.$hiddenOperationIds, [hiddenOp.id])
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);
      await allSettled(operationsContextModel.setFilter, {
        scope,
        params: { status: ['in_progress'] },
      });

      const sections = scope.getState(operationsContextModel.$sectionedOperations);

      expect(sections.map(s => s.section)).toEqual(['in_progress']);
      expect(sections[0]?.items.map(i => i.operation.id)).toEqual([pendingOp.id]);
    });

    it('should keep an empty In-progress section on the pending tab while nothing narrows the list', async () => {
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [])
          .set(operationsContextModel.$tab, 'pending')
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      expect(scope.getState(operationsContextModel.$sectionedOperations)).toEqual([
        { section: 'in_progress', items: [] },
      ]);
    });

    it('should drop the empty In-progress section once a narrowing filter matches nothing', async () => {
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [])
          .set(operationsContextModel.$tab, 'pending')
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      await allSettled(operationsContextModel.setFilter, { scope, params: { searchQuery: 'zzzz-no-match' } });
      expect(scope.getState(operationsContextModel.$sectionedOperations)).toEqual([]);

      await allSettled(operationsContextModel.resetFilters, { scope });
      await allSettled(operationsContextModel.setFilter, { scope, params: { network: ['polkadot'] } });
      expect(scope.getState(operationsContextModel.$sectionedOperations)).toEqual([]);
    });

    it('should not keep the empty In-progress section on the history tab', async () => {
      const scope = fork({
        values: new Map()
          .set(multisigOperation.__test.$cachedOperations, [])
          .set(operationsContextModel.$tab, 'history')
          .set(accounts.__test.$populated, true),
      });
      await populateAccounts(scope, [mockMultisigAccount]);

      expect(scope.getState(operationsContextModel.$sectionedOperations)).toEqual([]);
    });
  });
});
