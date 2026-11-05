import { act, renderHook } from '@testing-library/react';
import { allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { type Balance, type Chain, type ChainId, ConnectionStatus } from '@/shared/core';
import { CHAIN_ANSWER_DEADLINE_MS } from '@/shared/lib/utils';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { useAccountRows } from '../useAccountRows';

const ACCOUNT = `0x${'a'.repeat(64)}`;
const SECOND_ACCOUNT = `0x${'b'.repeat(64)}`;
// The records below carry no asset id, so they never turn into rows: these
// tests are about readiness only.
const ASSETS = [{ assetId: 0 }];
const CHAIN = { chainId: '0x01', name: 'Enabled', options: [], assets: ASSETS } as unknown as Chain;
const SECOND_CHAIN = { chainId: '0x02', name: 'Second', options: [], assets: ASSETS } as unknown as Chain;
const ASSETLESS_CHAIN = { chainId: '0x02', name: 'Assetless', options: [], assets: [] } as unknown as Chain;
const walletAccount = (accountId: string): AnyAccount => ({ accountId }) as unknown as AnyAccount;
const record = (accountId: string, chainId: ChainId): Balance =>
  ({ id: `${accountId}-${chainId}`, accountId, chainId }) as unknown as Balance;
const toMap = (balances: Balance[]) => Object.fromEntries(balances.map((balance) => [balance.id, balance]));

type Options = {
  balances?: Balance[];
  /** Adds a second enabled chain in this connection state. */
  secondChainStatus?: ConnectionStatus;
  secondChain?: Chain;
};

const setup = async (
  selection: string[],
  { balances = [], secondChainStatus, secondChain = SECOND_CHAIN }: Options = {},
) => {
  const scope = fork({
    values: [
      [balanceModel.__test.$balanceMap, toMap(balances)],
      [accounts.__test.$list, [walletAccount(ACCOUNT), walletAccount(SECOND_ACCOUNT)]],
      [
        networkModel.$chains,
        { [CHAIN.chainId]: CHAIN, ...(secondChainStatus ? { [secondChain.chainId]: secondChain } : {}) },
      ],
      [networkModel.$connections, {}],
      [
        networkModel.$connectionStatuses,
        {
          [CHAIN.chainId]: ConnectionStatus.CONNECTED,
          ...(secondChainStatus ? { [secondChain.chainId]: secondChainStatus } : {}),
        },
      ],
    ],
  });
  const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;

  const hook = renderHook(
    ({ accountIds }: { accountIds: string[] }) =>
      useAccountRows(
        accountIds,
        accountIds.map((accountId) => ({ accountId, name: accountId })),
      ),
    { wrapper, initialProps: { accountIds: selection } },
  );
  // Name resolution for the selection settles a tick after mount.
  await act(async () => {});

  return { hook, scope };
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
    const { hook } = await setup([]);

    expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 0, syncing: false });
  });

  it('SP-29: a selection without balance records is not ready until the wait runs out', async () => {
    const { hook } = await setup([ACCOUNT]);

    expect(hook.result.current).toEqual({ rows: [], ready: false, missingCount: 0, syncing: true });

    act(() => {
      vi.advanceTimersByTime(CHAIN_ANSWER_DEADLINE_MS);
    });
    expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 1, syncing: false });
  });

  describe('several chains', () => {
    const SELECTION = [ACCOUNT, SECOND_ACCOUNT];
    const FIRST_CHAIN_ANSWERED = [record(ACCOUNT, CHAIN.chainId), record(SECOND_ACCOUNT, CHAIN.chainId)];
    const BOTH_CONNECTED = {
      [CHAIN.chainId]: ConnectionStatus.CONNECTED,
      [SECOND_CHAIN.chainId]: ConnectionStatus.CONNECTED,
    };

    it('is not ready while a connected chain has not answered, though another chain did', async () => {
      const { hook } = await setup(SELECTION, {
        balances: FIRST_CHAIN_ANSWERED,
        secondChainStatus: ConnectionStatus.CONNECTED,
      });

      expect(hook.result.current).toEqual({ rows: [], ready: false, missingCount: 0, syncing: true });
    });

    it('once the wait runs out, counts the accounts still missing a connected chain', async () => {
      const { hook } = await setup(SELECTION, {
        balances: [...FIRST_CHAIN_ANSWERED, record(ACCOUNT, SECOND_CHAIN.chainId)],
        secondChainStatus: ConnectionStatus.CONNECTED,
      });

      expect(hook.result.current.ready).toBe(false);

      act(() => {
        vi.advanceTimersByTime(CHAIN_ANSWER_DEADLINE_MS);
      });
      expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 1, syncing: false });
    });

    it('is ready and syncing while the other chain is still connecting', async () => {
      const { hook } = await setup(SELECTION, {
        balances: FIRST_CHAIN_ANSWERED,
        secondChainStatus: ConnectionStatus.CONNECTING,
      });

      expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 0, syncing: true });
    });

    it('stays ready when a chain connects after the table was shown: syncing first, a count once the wait runs out', async () => {
      const { hook, scope } = await setup(SELECTION, {
        balances: FIRST_CHAIN_ANSWERED,
        secondChainStatus: ConnectionStatus.CONNECTING,
      });
      expect(hook.result.current.ready).toBe(true);

      await act(() => allSettled(networkModel.$connectionStatuses, { scope, params: BOTH_CONNECTED }));
      // The chain is connected but silent: the table stays, and says it is still syncing.
      expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 0, syncing: true });

      act(() => {
        vi.advanceTimersByTime(CHAIN_ANSWER_DEADLINE_MS);
      });
      expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 2, syncing: false });
    });

    it('stops syncing without a count once the late chain answers', async () => {
      const { hook, scope } = await setup(SELECTION, {
        balances: FIRST_CHAIN_ANSWERED,
        secondChainStatus: ConnectionStatus.CONNECTING,
      });

      await act(() => allSettled(networkModel.$connectionStatuses, { scope, params: BOTH_CONNECTED }));
      await act(() =>
        allSettled(balanceModel.__test.$balanceMap, {
          scope,
          params: toMap([
            ...FIRST_CHAIN_ANSWERED,
            record(ACCOUNT, SECOND_CHAIN.chainId),
            record(SECOND_ACCOUNT, SECOND_CHAIN.chainId),
          ]),
        }),
      );

      expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 0, syncing: false });
    });

    it('a new selection starts over from the skeleton', async () => {
      const { hook } = await setup([ACCOUNT], {
        balances: [record(ACCOUNT, CHAIN.chainId)],
      });
      expect(hook.result.current.ready).toBe(true);

      hook.rerender({ accountIds: SELECTION });
      await act(async () => {});

      expect(hook.result.current).toEqual({ rows: [], ready: false, missingCount: 0, syncing: true });
    });

    it.each([
      ['failing', ConnectionStatus.ERROR],
      ['disconnected', ConnectionStatus.DISCONNECTED],
    ])('a chain that is %s is neither waited for nor shown as syncing', async (_, secondChainStatus) => {
      const { hook } = await setup(SELECTION, { balances: FIRST_CHAIN_ANSWERED, secondChainStatus });

      expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 0, syncing: false });
    });

    it('a connected chain without assets is not waited for', async () => {
      const { hook } = await setup(SELECTION, {
        balances: FIRST_CHAIN_ANSWERED,
        secondChainStatus: ConnectionStatus.CONNECTED,
        secondChain: ASSETLESS_CHAIN,
      });

      expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 0, syncing: false });

      act(() => {
        vi.advanceTimersByTime(CHAIN_ANSWER_DEADLINE_MS);
      });
      expect(hook.result.current).toEqual({ rows: [], ready: true, missingCount: 0, syncing: false });
    });
  });
});
