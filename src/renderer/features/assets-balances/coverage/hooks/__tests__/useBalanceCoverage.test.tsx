import { act, renderHook } from '@testing-library/react';
import { type Scope, allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { type Balance, type Chain } from '@/shared/core';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { BALANCE_COVERAGE_TIMEOUT_MS, useBalanceCoverage } from '../useBalanceCoverage';

const ACCOUNT_A = `0x${'a'.repeat(64)}`;
const ACCOUNT_B = `0x${'b'.repeat(64)}`;
const ACCOUNT_C = `0x${'c'.repeat(64)}`;
const SELECTION = [ACCOUNT_A, ACCOUNT_B, ACCOUNT_C];

const CHAIN = { chainId: '0x01', options: [], assets: [] } as unknown as Chain;

const record = (accountId: string): Balance => ({ id: accountId, accountId }) as unknown as Balance;
const toMap = (balances: Balance[]) => Object.fromEntries(balances.map((balance) => [balance.id, balance]));

const setup = (balances: Balance[]) => {
  const scope = fork({
    values: [
      [balanceModel.__test.$balanceMap, toMap(balances)],
      [networkModel.$chains, { [CHAIN.chainId]: CHAIN }],
    ],
  });
  const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
  const hook = renderHook(() => useBalanceCoverage(SELECTION), { wrapper });

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
  });

  test('waits for every selected account, not the first one to answer', async () => {
    const { scope, hook } = setup([record(ACCOUNT_A)]);

    expect(hook.result.current).toEqual({ complete: false, awaitingCount: 2, timedOut: false });

    await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B)]);
    expect(hook.result.current).toEqual({ complete: false, awaitingCount: 1, timedOut: false });

    await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B), record(ACCOUNT_C)]);
    expect(hook.result.current).toEqual({ complete: true, awaitingCount: 0, timedOut: false });
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
