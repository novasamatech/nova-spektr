import { allSettled, fork } from 'effector';
import { afterEach, describe, expect, it } from 'vitest';

import { type Wallet } from '@/shared/core';
import { type AnyAccount, accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { dashboardModel } from '../dashboard-model';

afterEach(() => localStorage.clear());

describe('dashboardModel.$widgetLayout', () => {
  it('sets a tab layout via layoutSet', async () => {
    const scope = fork();
    await allSettled(dashboardModel.layoutSet, {
      scope,
      params: { tab: 'overview', layout: { a: { x: 0, y: 0, w: 2, h: 2 } } },
    });

    expect(scope.getState(dashboardModel.$widgetLayout)).toEqual({
      overview: { a: { x: 0, y: 0, w: 2, h: 2 } },
    });
  });

  it('moves a widget and resolves collisions', async () => {
    const scope = fork({
      values: [
        [dashboardModel.$widgetLayout, { overview: { a: { x: 0, y: 0, w: 2, h: 2 }, b: { x: 2, y: 0, w: 2, h: 2 } } }],
      ],
    });

    await allSettled(dashboardModel.widgetMoved, {
      scope,
      params: { tab: 'overview', key: 'b', x: 0, y: 0 },
    });

    const layout = scope.getState(dashboardModel.$widgetLayout).overview!;
    expect(layout.b).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(layout.a).toEqual({ x: 0, y: 2, w: 2, h: 2 });
  });

  it('reset empties the tab layout', async () => {
    const scope = fork({
      values: [[dashboardModel.$widgetLayout, { overview: { a: { x: 0, y: 0, w: 2, h: 2 } } }]],
    });
    await allSettled(dashboardModel.layoutReset, { scope, params: { tab: 'overview' } });
    expect(scope.getState(dashboardModel.$widgetLayout).overview).toEqual({});
  });
});

describe('dashboardModel.$hiddenWidgets', () => {
  it('adds a key on widgetHidden', async () => {
    const scope = fork();
    await allSettled(dashboardModel.widgetHidden, {
      scope,
      params: { tab: 'overview', key: 'feature: dashboard/price-charts' },
    });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toEqual({
      overview: ['feature: dashboard/price-charts'],
    });
  });

  it('does not duplicate an already hidden key', async () => {
    const initial = { overview: ['a'] };
    const scope = fork({ values: [[dashboardModel.$hiddenWidgets, initial]] });
    await allSettled(dashboardModel.widgetHidden, { scope, params: { tab: 'overview', key: 'a' } });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toBe(initial);
  });

  it('removes the key on widgetRestored', async () => {
    const scope = fork({ values: [[dashboardModel.$hiddenWidgets, { overview: ['a', 'b'] }]] });
    await allSettled(dashboardModel.widgetRestored, { scope, params: { tab: 'overview', key: 'a' } });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toEqual({ overview: ['b'] });
  });

  it('layoutReset clears the hidden set of that tab only', async () => {
    const scope = fork({
      values: [[dashboardModel.$hiddenWidgets, { overview: ['a'], staking: ['b'] }]],
    });
    await allSettled(dashboardModel.layoutReset, { scope, params: { tab: 'overview' } });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toEqual({ overview: [], staking: ['b'] });
  });

  it('keeps state identity on no-op restore and reset', async () => {
    const initial = { overview: ['a'] };
    const scope = fork({ values: [[dashboardModel.$hiddenWidgets, initial]] });

    await allSettled(dashboardModel.widgetRestored, { scope, params: { tab: 'staking', key: 'x' } });
    await allSettled(dashboardModel.layoutReset, { scope, params: { tab: 'staking' } });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toBe(initial);
  });
});

describe('dashboardModel.$selectedAccounts', () => {
  const KEY = `0x${'a'.repeat(64)}`;
  const VISIBLE_WALLET = { id: 1, name: 'Visible', hiddenReason: null } as unknown as Wallet;
  const HIDDEN_WALLET = { id: 2, name: 'Hidden', hiddenReason: 'manual' } as unknown as Wallet;
  const account = (id: string, walletId: number, chainId: string): AnyAccount =>
    ({ id, accountId: KEY, walletId, chainId, type: 'chain', name: id }) as unknown as AnyAccount;

  it('requests every visible account of a selected key, and no account of a hidden wallet', async () => {
    const polkadot = account('polkadot', VISIBLE_WALLET.id, '0x01');
    const kusama = account('kusama', VISIBLE_WALLET.id, '0x02');
    const hidden = account('hidden', HIDDEN_WALLET.id, '0x03');
    const scope = fork();

    await allSettled(walletModel.__test.$rawWallets, { scope, params: [VISIBLE_WALLET, HIDDEN_WALLET] });
    await allSettled(accounts.__test.$list, { scope, params: [polkadot, kusama, hidden] });

    // One entry stands for the key, named after its first account — the request
    // still covers the chains of both visible accounts.
    expect(scope.getState(dashboardModel.$allEntries).map((entry) => entry.id)).toEqual(['polkadot']);
    expect(scope.getState(dashboardModel.$selectedAccounts)).toEqual([polkadot, kusama]);
  });
});
