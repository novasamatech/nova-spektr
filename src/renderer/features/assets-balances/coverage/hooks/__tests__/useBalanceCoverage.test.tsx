import { act, renderHook } from '@testing-library/react';
import { type Scope, allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { type Balance, type Chain, type Connection, ConnectionType } from '@/shared/core';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { BALANCE_COVERAGE_TIMEOUT_MS, useBalanceCoverage } from '../useBalanceCoverage';

const ACCOUNT_A = `0x${'a'.repeat(64)}`;
const ACCOUNT_B = `0x${'b'.repeat(64)}`;
const ACCOUNT_C = `0x${'c'.repeat(64)}`;
const SELECTION = [ACCOUNT_A, ACCOUNT_B, ACCOUNT_C];

const CHAIN = { chainId: '0x01', name: 'Enabled', options: [], assets: [] } as unknown as Chain;
const DISABLED_CHAIN = { chainId: '0x02', name: 'Disabled', options: [], assets: [] } as unknown as Chain;
const DISABLED_CONNECTION = {
  chainId: DISABLED_CHAIN.chainId,
  connectionType: ConnectionType.DISABLED,
} as unknown as Connection;

const record = (accountId: string): Balance => ({ id: accountId, accountId }) as unknown as Balance;
const walletAccount = (accountId: string): AnyAccount => ({ accountId }) as unknown as AnyAccount;
const toMap = (balances: Balance[]) => Object.fromEntries(balances.map((balance) => [balance.id, balance]));

const setup = (balances: Balance[], selection: string[] = SELECTION) => {
  const scope = fork({
    values: [
      [balanceModel.__test.$balanceMap, toMap(balances)],
      [networkModel.$chains, { [CHAIN.chainId]: CHAIN, [DISABLED_CHAIN.chainId]: DISABLED_CHAIN }],
      [networkModel.$connections, { [DISABLED_CHAIN.chainId]: DISABLED_CONNECTION }],
    ],
  });
  const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
  const hook = renderHook(() => useBalanceCoverage(selection), { wrapper });

  return { scope, hook };
};

const land = async (scope: Scope, balances: Balance[]) => {
  await act(() => allSettled(balanceModel.__test.$balanceMap, { scope, params: toMap(balances) }));
};

describe('useBalanceCoverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('waits for every selected account, not the first one to answer', async () => {
    const { scope, hook } = setup([record(ACCOUNT_A)]);

    expect(hook.result.current).toEqual({ complete: false, awaitingCount: 2, timedOut: false });

    await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B)]);
    expect(hook.result.current).toEqual({ complete: false, awaitingCount: 1, timedOut: false });

    await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B), record(ACCOUNT_C)]);
    expect(hook.result.current).toEqual({ complete: true, awaitingCount: 0, timedOut: false });
  });

  test('does not wait for an account that lives only on a disabled chain', async () => {
    vi.spyOn(accountService, 'isAccountAvailableOnChain').mockImplementation(
      (account, chain) => account.accountId === ACCOUNT_A || chain.chainId === DISABLED_CHAIN.chainId,
    );
    const scope = fork({
      values: [
        [balanceModel.__test.$balanceMap, toMap([])],
        [accounts.__test.$list, [walletAccount(ACCOUNT_A), walletAccount(ACCOUNT_B)]],
        [networkModel.$chains, { [CHAIN.chainId]: CHAIN, [DISABLED_CHAIN.chainId]: DISABLED_CHAIN }],
        [networkModel.$connections, { [DISABLED_CHAIN.chainId]: DISABLED_CONNECTION }],
      ],
    });
    const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
    const hook = renderHook(() => useBalanceCoverage([ACCOUNT_A, ACCOUNT_B]), { wrapper });

    expect(hook.result.current).toEqual({ complete: false, awaitingCount: 1, timedOut: false });

    // B is available only on the disabled chain: A's record alone completes the selection.
    await land(scope, [record(ACCOUNT_A)]);
    expect(hook.result.current).toEqual({ complete: true, awaitingCount: 0, timedOut: false });
  });

  test('does not re-render on a balance update that leaves coverage unchanged', async () => {
    const { scope, hook } = setup([record(ACCOUNT_A), record(ACCOUNT_B), record(ACCOUNT_C)]);
    const before = hook.result.current;
    expect(before.complete).toBe(true);

    await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B), record(ACCOUNT_C), record(`0x${'d'.repeat(64)}`)]);
    expect(hook.result.current).toBe(before);
  });

  test('stops waiting after the timeout, still reporting who is missing', () => {
    const { hook } = setup([record(ACCOUNT_A)]);

    act(() => {
      vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS - 1);
    });
    expect(hook.result.current.timedOut).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(hook.result.current).toEqual({ complete: false, awaitingCount: 2, timedOut: true });
  });
});
