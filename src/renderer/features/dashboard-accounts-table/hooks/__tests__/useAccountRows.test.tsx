import { act, renderHook } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { type Chain } from '@/shared/core';
import { CHAIN_ANSWER_DEADLINE_MS } from '@/shared/lib/utils';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { useAccountRows } from '../useAccountRows';

const ACCOUNT = `0x${'a'.repeat(64)}`;
const CHAIN = { chainId: '0x01', name: 'Enabled', options: [], assets: [] } as unknown as Chain;
const walletAccount = (accountId: string): AnyAccount => ({ accountId }) as unknown as AnyAccount;

const setup = async (selection: string[]) => {
  const scope = fork({
    values: [
      [balanceModel.__test.$balanceMap, {}],
      [accounts.__test.$list, [walletAccount(ACCOUNT)]],
      [networkModel.$chains, { [CHAIN.chainId]: CHAIN }],
      [networkModel.$connections, {}],
    ],
  });
  const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
  const entries = selection.map((accountId) => ({ accountId, name: accountId }));

  const hook = renderHook(() => useAccountRows(selection, entries), { wrapper });
  // Name resolution for the selection settles a tick after mount.
  await act(async () => {});

  return hook;
};

describe('features/dashboard-accounts-table/hooks/useAccountRows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(accountService, 'isAccountAvailableOnChain').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('SP-29: an empty selection is ready at once — no rows, nothing awaited, no timer to wait out', async () => {
    const hook = await setup([]);

    expect(hook.result.current).toEqual({ rows: [], ready: true, awaitingCount: 0 });
  });

  it('SP-29: a selection without balance records is not ready until the wait runs out', async () => {
    const hook = await setup([ACCOUNT]);

    expect(hook.result.current).toEqual({ rows: [], ready: false, awaitingCount: 1 });

    act(() => {
      vi.advanceTimersByTime(CHAIN_ANSWER_DEADLINE_MS);
    });
    expect(hook.result.current).toEqual({ rows: [], ready: true, awaitingCount: 1 });
  });
});
