import { act, renderHook } from '@testing-library/react';
import { type Scope, allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { type PropsWithChildren } from 'react';

import {
  type Balance,
  type Chain,
  type ChainId,
  type Connection,
  ConnectionStatus,
  ConnectionType,
} from '@/shared/core';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { BALANCE_COVERAGE_TIMEOUT_MS, useBalanceCoverage } from '../useBalanceCoverage';

const ACCOUNT_A = `0x${'a'.repeat(64)}`;
const ACCOUNT_B = `0x${'b'.repeat(64)}`;
const ACCOUNT_C = `0x${'c'.repeat(64)}`;
const SELECTION = [ACCOUNT_A, ACCOUNT_B, ACCOUNT_C];

const ASSETS = [{ assetId: 0 }];
const CHAIN = { chainId: '0x01', name: 'Enabled', options: [], assets: ASSETS } as unknown as Chain;
const SECOND_CHAIN = { chainId: '0x03', name: 'Second', options: [], assets: ASSETS } as unknown as Chain;
const DISABLED_CHAIN = { chainId: '0x02', name: 'Disabled', options: [], assets: ASSETS } as unknown as Chain;
const ASSETLESS_CHAIN = { chainId: '0x04', name: 'Assetless', options: [], assets: [] } as unknown as Chain;
const DISABLED_CONNECTION = {
  chainId: DISABLED_CHAIN.chainId,
  connectionType: ConnectionType.DISABLED,
} as unknown as Connection;

const record = (accountId: string, chainId: ChainId = CHAIN.chainId): Balance =>
  ({ id: `${accountId}-${chainId}`, accountId, chainId }) as unknown as Balance;
const VISIBLE_WALLET = { id: 1, hiddenReason: null };
const HIDDEN_WALLET = { id: 2, hiddenReason: 'manual' };
const walletAccount = (accountId: string, walletId = VISIBLE_WALLET.id): AnyAccount =>
  ({ accountId, walletId }) as unknown as AnyAccount;
const toMap = (balances: Balance[]) => Object.fromEntries(balances.map((balance) => [balance.id, balance]));

const setup = (balances: Balance[], selection: string[] = SELECTION) => {
  const scope = fork({
    values: [
      [balanceModel.__test.$balanceMap, toMap(balances)],
      [networkModel.$chains, { [CHAIN.chainId]: CHAIN, [DISABLED_CHAIN.chainId]: DISABLED_CHAIN }],
      [networkModel.$connections, { [DISABLED_CHAIN.chainId]: DISABLED_CONNECTION }],
      [
        networkModel.$connectionStatuses,
        { [CHAIN.chainId]: ConnectionStatus.CONNECTED, [DISABLED_CHAIN.chainId]: ConnectionStatus.DISCONNECTED },
      ],
    ],
  });
  const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
  const hook = renderHook(() => useBalanceCoverage(selection), { wrapper });

  return { scope, hook };
};

// Two enabled chains, both selected accounts requested on each.
const setupTwoChains = (balances: Balance[], secondChainStatus: ConnectionStatus, secondChain = SECOND_CHAIN) => {
  const scope = fork({
    values: [
      [balanceModel.__test.$balanceMap, toMap(balances)],
      [networkModel.$chains, { [CHAIN.chainId]: CHAIN, [SECOND_CHAIN.chainId]: secondChain }],
      [networkModel.$connections, {}],
      [
        networkModel.$connectionStatuses,
        { [CHAIN.chainId]: ConnectionStatus.CONNECTED, [SECOND_CHAIN.chainId]: secondChainStatus },
      ],
    ],
  });
  const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
  const hook = renderHook(() => useBalanceCoverage([ACCOUNT_A, ACCOUNT_B]), { wrapper });

  return { scope, hook };
};

const land = async (scope: Scope, balances: Balance[]) => {
  await act(() => allSettled(balanceModel.__test.$balanceMap, { scope, params: toMap(balances) }));
};

const setStatuses = async (scope: Scope, statuses: Record<ChainId, ConnectionStatus>) => {
  await act(() => allSettled(networkModel.$connectionStatuses, { scope, params: statuses }));
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

    expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

    await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B)]);
    expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

    await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B), record(ACCOUNT_C)]);
    expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });
  });

  describe('several connected chains', () => {
    const FIRST_CHAIN_ANSWERED = [record(ACCOUNT_A), record(ACCOUNT_B)];

    test('waits for every connected chain, not the first one to answer', async () => {
      const { scope, hook } = setupTwoChains(FIRST_CHAIN_ANSWERED, ConnectionStatus.CONNECTED);

      // The second chain is connected, but none of its balances has landed.
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      await land(scope, [...FIRST_CHAIN_ANSWERED, record(ACCOUNT_A, SECOND_CHAIN.chainId)]);
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      await land(scope, [
        ...FIRST_CHAIN_ANSWERED,
        record(ACCOUNT_A, SECOND_CHAIN.chainId),
        record(ACCOUNT_B, SECOND_CHAIN.chainId),
      ]);
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });
    });

    test('a chain that is still connecting does not hold coverage back and is reported as syncing', () => {
      const { hook } = setupTwoChains(FIRST_CHAIN_ANSWERED, ConnectionStatus.CONNECTING);

      expect(hook.result.current).toEqual({ ready: true, syncing: true, missingCount: 0 });
    });

    test('starts waiting for a chain once it connects, and stays shown for the selection', async () => {
      const { scope, hook } = setupTwoChains(FIRST_CHAIN_ANSWERED, ConnectionStatus.CONNECTING);
      expect(hook.result.current.ready).toBe(true);

      await setStatuses(scope, {
        [CHAIN.chainId]: ConnectionStatus.CONNECTED,
        [SECOND_CHAIN.chainId]: ConnectionStatus.CONNECTED,
      });
      // The newly connected chain is awaited, but what was already answered stays answered.
      expect(hook.result.current).toEqual({ ready: true, syncing: true, missingCount: 0 });

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 2 });
    });

    test('a new selection is not shown on the strength of the previous one', async () => {
      const scope = fork({
        values: [
          [balanceModel.__test.$balanceMap, toMap([record(ACCOUNT_A)])],
          [networkModel.$chains, { [CHAIN.chainId]: CHAIN }],
          [networkModel.$connections, {}],
          [networkModel.$connectionStatuses, { [CHAIN.chainId]: ConnectionStatus.CONNECTED }],
        ],
      });
      const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
      const hook = renderHook(({ selection }: { selection: string[] }) => useBalanceCoverage(selection), {
        wrapper,
        initialProps: { selection: [ACCOUNT_A] },
      });
      expect(hook.result.current.ready).toBe(true);

      hook.rerender({ selection: [ACCOUNT_A, ACCOUNT_B] });
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B)]);
      expect(hook.result.current.ready).toBe(true);

      // Another selection again: a new question, even though the previous one was shown a moment ago.
      hook.rerender({ selection: [ACCOUNT_B, ACCOUNT_C] });
      expect(hook.result.current.ready).toBe(false);
    });

    test.each([
      ['failing', ConnectionStatus.ERROR],
      ['disconnected', ConnectionStatus.DISCONNECTED],
    ])('a chain that is %s is neither awaited nor reported as syncing', (_, status) => {
      const { hook } = setupTwoChains(FIRST_CHAIN_ANSWERED, status);

      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });
    });

    test('a connected chain without assets is not awaited', () => {
      const { hook } = setupTwoChains(FIRST_CHAIN_ANSWERED, ConnectionStatus.CONNECTED, {
        ...ASSETLESS_CHAIN,
        chainId: SECOND_CHAIN.chainId,
      });

      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });
    });

    test('records kept from an earlier session cover a chain as soon as it connects', async () => {
      const cached = [
        ...FIRST_CHAIN_ANSWERED,
        record(ACCOUNT_A, SECOND_CHAIN.chainId),
        record(ACCOUNT_B, SECOND_CHAIN.chainId),
      ];
      const { scope, hook } = setupTwoChains(cached, ConnectionStatus.CONNECTING);

      await setStatuses(scope, {
        [CHAIN.chainId]: ConnectionStatus.CONNECTED,
        [SECOND_CHAIN.chainId]: ConnectionStatus.CONNECTED,
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });
    });

    test('an account that lives only on a connecting chain is not awaited, and is reported as syncing', () => {
      vi.spyOn(accountService, 'isAccountAvailableOnChain').mockImplementation(
        (account, chain) => account.accountId === ACCOUNT_A || chain.chainId === SECOND_CHAIN.chainId,
      );
      const scope = fork({
        values: [
          [balanceModel.__test.$balanceMap, toMap([record(ACCOUNT_A)])],
          [walletModel.__test.$rawWallets, [VISIBLE_WALLET]],
          [accounts.__test.$list, [walletAccount(ACCOUNT_A), walletAccount(ACCOUNT_B)]],
          [networkModel.$chains, { [CHAIN.chainId]: CHAIN, [SECOND_CHAIN.chainId]: SECOND_CHAIN }],
          [networkModel.$connections, {}],
          [
            networkModel.$connectionStatuses,
            { [CHAIN.chainId]: ConnectionStatus.CONNECTED, [SECOND_CHAIN.chainId]: ConnectionStatus.CONNECTING },
          ],
        ],
      });
      const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
      const hook = renderHook(() => useBalanceCoverage([ACCOUNT_A, ACCOUNT_B]), { wrapper });

      expect(hook.result.current).toEqual({ ready: true, syncing: true, missingCount: 0 });
    });
  });

  test('does not wait for an account that lives only on a disabled chain', async () => {
    vi.spyOn(accountService, 'isAccountAvailableOnChain').mockImplementation(
      (account, chain) => account.accountId === ACCOUNT_A || chain.chainId === DISABLED_CHAIN.chainId,
    );
    const scope = fork({
      values: [
        [balanceModel.__test.$balanceMap, toMap([])],
        [walletModel.__test.$rawWallets, [VISIBLE_WALLET]],
        [accounts.__test.$list, [walletAccount(ACCOUNT_A), walletAccount(ACCOUNT_B)]],
        [networkModel.$chains, { [CHAIN.chainId]: CHAIN, [DISABLED_CHAIN.chainId]: DISABLED_CHAIN }],
        [networkModel.$connections, { [DISABLED_CHAIN.chainId]: DISABLED_CONNECTION }],
        [
          networkModel.$connectionStatuses,
          { [CHAIN.chainId]: ConnectionStatus.CONNECTED, [DISABLED_CHAIN.chainId]: ConnectionStatus.DISCONNECTED },
        ],
      ],
    });
    const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
    const hook = renderHook(() => useBalanceCoverage([ACCOUNT_A, ACCOUNT_B]), { wrapper });

    expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

    // B is available only on the disabled chain: A's record alone completes the selection.
    await land(scope, [record(ACCOUNT_A)]);
    expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });
  });

  test('does not re-render on a balance update that leaves coverage unchanged', async () => {
    const { scope, hook } = setup([record(ACCOUNT_A), record(ACCOUNT_B), record(ACCOUNT_C)]);
    const before = hook.result.current;
    expect(before.ready).toBe(true);

    await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B), record(ACCOUNT_C), record(`0x${'d'.repeat(64)}`)]);
    expect(hook.result.current).toBe(before);
  });

  test('stops waiting after the timeout, still reporting who is missing', () => {
    const { hook } = setup([record(ACCOUNT_A)]);

    act(() => {
      vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS - 1);
    });
    expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 2 });
  });

  describe('a contact in the selection', () => {
    test('SP-27: keeps waiting for a contact (no wallet account) that fits a chain by address scheme', async () => {
      vi.spyOn(accountService, 'isAccountAvailableOnChain').mockReturnValue(true);
      const scope = fork({
        values: [
          [balanceModel.__test.$balanceMap, toMap([record(ACCOUNT_A)])],
          // A is a wallet account; B is known only by its id — a contact.
          [walletModel.__test.$rawWallets, [VISIBLE_WALLET]],
          [accounts.__test.$list, [walletAccount(ACCOUNT_A)]],
          [networkModel.$chains, { [CHAIN.chainId]: CHAIN }],
          [networkModel.$connections, {}],
          [networkModel.$connectionStatuses, { [CHAIN.chainId]: ConnectionStatus.CONNECTED }],
        ],
      });
      const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
      const hook = renderHook(() => useBalanceCoverage([ACCOUNT_A, ACCOUNT_B]), { wrapper });

      // The funded wallet account answered; the contact has not — not complete.
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      await land(scope, [record(ACCOUNT_A), record(ACCOUNT_B)]);
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });
    });
  });

  describe('after the timeout', () => {
    test('SP-28: reports a single missing account after the timeout', () => {
      const { hook } = setup([record(ACCOUNT_A), record(ACCOUNT_B)]);

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 1 });
    });

    test('SP-28: reports every missing account after the timeout', () => {
      const { hook } = setup([record(ACCOUNT_A)]);

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 2 });
    });

    test('reports an account missing on one connected chain after the timeout', () => {
      const { hook } = setupTwoChains(
        [record(ACCOUNT_A), record(ACCOUNT_B), record(ACCOUNT_A, SECOND_CHAIN.chainId)],
        ConnectionStatus.CONNECTED,
      );

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 1 });
    });

    test('SP-28: changing the selection re-arms the wait', () => {
      const scope = fork({
        values: [
          [balanceModel.__test.$balanceMap, toMap([record(ACCOUNT_A)])],
          [networkModel.$chains, { [CHAIN.chainId]: CHAIN }],
          [networkModel.$connections, {}],
          [networkModel.$connectionStatuses, { [CHAIN.chainId]: ConnectionStatus.CONNECTED }],
        ],
      });
      const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
      const hook = renderHook(({ selection }: { selection: string[] }) => useBalanceCoverage(selection), {
        wrapper,
        initialProps: { selection: [ACCOUNT_A, ACCOUNT_B] },
      });

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 1 });

      // A new selection is a new question: back to waiting, with a fresh timer.
      hook.rerender({ selection: [ACCOUNT_A, ACCOUNT_C] });
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS - 1);
      });
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 1 });
    });

    test('SP-28: the same selection re-rendered does not restart the wait', () => {
      const { hook } = setup([record(ACCOUNT_A)]);

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(hook.result.current.missingCount).toBe(2);

      hook.rerender();
      expect(hook.result.current.missingCount).toBe(2);
    });
  });

  describe('the wait follows the connected chains', () => {
    const FIRST_CHAIN_ANSWERED = [record(ACCOUNT_A), record(ACCOUNT_B)];
    const BOTH_CONNECTED = {
      [CHAIN.chainId]: ConnectionStatus.CONNECTED,
      [SECOND_CHAIN.chainId]: ConnectionStatus.CONNECTED,
    };

    test('a chain that connects after the first wait ran out is syncing, and counted only once its own wait runs out', async () => {
      const { scope, hook } = setupTwoChains(FIRST_CHAIN_ANSWERED, ConnectionStatus.CONNECTING);

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS + 5_000);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: true, missingCount: 0 });

      // Asked only now: on its way, not missing.
      await setStatuses(scope, BOTH_CONNECTED);
      expect(hook.result.current).toEqual({ ready: true, syncing: true, missingCount: 0 });

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS - 1);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: true, missingCount: 0 });

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 2 });
    });

    test('a late chain that answers within its wait is never counted', async () => {
      const { scope, hook } = setupTwoChains(FIRST_CHAIN_ANSWERED, ConnectionStatus.CONNECTING);

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS + 5_000);
      });
      await setStatuses(scope, BOTH_CONNECTED);
      await land(scope, [
        ...FIRST_CHAIN_ANSWERED,
        record(ACCOUNT_A, SECOND_CHAIN.chainId),
        record(ACCOUNT_B, SECOND_CHAIN.chainId),
      ]);

      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });
    });

    test('a status change of a chain the selection is not requested on does not re-render', async () => {
      let renders = 0;
      const scope = fork({
        values: [
          [balanceModel.__test.$balanceMap, toMap([record(ACCOUNT_A)])],
          [networkModel.$chains, { [CHAIN.chainId]: CHAIN }],
          [networkModel.$connections, {}],
          [networkModel.$connectionStatuses, { [CHAIN.chainId]: ConnectionStatus.CONNECTED }],
        ],
      });
      const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
      const hook = renderHook(
        () => {
          renders += 1;

          return useBalanceCoverage([ACCOUNT_A]);
        },
        { wrapper },
      );
      const before = hook.result.current;
      const rendersBefore = renders;

      await setStatuses(scope, { [CHAIN.chainId]: ConnectionStatus.CONNECTED, '0x09': ConnectionStatus.CONNECTING });
      await setStatuses(scope, { [CHAIN.chainId]: ConnectionStatus.CONNECTED, '0x09': ConnectionStatus.CONNECTED });

      expect(renders).toBe(rendersBefore);
      expect(hook.result.current).toBe(before);
    });
  });

  describe('switching selections', () => {
    const setupSwitch = () => {
      const scope = fork({
        values: [
          [balanceModel.__test.$balanceMap, toMap([record(ACCOUNT_A)])],
          [networkModel.$chains, { [CHAIN.chainId]: CHAIN }],
          [networkModel.$connections, {}],
          [networkModel.$connectionStatuses, { [CHAIN.chainId]: ConnectionStatus.CONNECTED }],
        ],
      });
      const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;

      return renderHook(({ selection }: { selection: string[] }) => useBalanceCoverage(selection), {
        wrapper,
        initialProps: { selection: [ACCOUNT_A, ACCOUNT_B] },
      });
    };

    test('coming back to a selection whose wait ran out starts a new wait', () => {
      const hook = setupSwitch();

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 1 });

      hook.rerender({ selection: [ACCOUNT_A, ACCOUNT_C] });
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      hook.rerender({ selection: [ACCOUNT_A, ACCOUNT_B] });
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 1 });
    });

    test('the wait of the previous selection does not run out for the new one', () => {
      const hook = setupSwitch();

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS - 10);
      });
      hook.rerender({ selection: [ACCOUNT_A, ACCOUNT_C] });

      act(() => {
        vi.advanceTimersByTime(10);
      });
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS - 10);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 1 });
    });
  });

  describe('a key that exists as several accounts', () => {
    const THIRD_CHAIN = { chainId: '0x05', name: 'Third', options: [], assets: ASSETS } as unknown as Chain;
    const scopedAccount = (chainId: ChainId, walletId = VISIBLE_WALLET.id): AnyAccount =>
      ({ accountId: ACCOUNT_A, walletId, chainId }) as unknown as AnyAccount;

    test('waits on the chains of every visible account of the key, and not on a hidden wallet', async () => {
      vi.spyOn(accountService, 'isAccountAvailableOnChain').mockImplementation(
        (account, chain) => 'chainId' in account && account.chainId === chain.chainId,
      );
      const scope = fork({
        values: [
          [balanceModel.__test.$balanceMap, toMap([record(ACCOUNT_A)])],
          [walletModel.__test.$rawWallets, [VISIBLE_WALLET, HIDDEN_WALLET]],
          [
            accounts.__test.$list,
            [
              scopedAccount(CHAIN.chainId),
              scopedAccount(SECOND_CHAIN.chainId),
              scopedAccount(THIRD_CHAIN.chainId, HIDDEN_WALLET.id),
            ],
          ],
          [
            networkModel.$chains,
            { [CHAIN.chainId]: CHAIN, [SECOND_CHAIN.chainId]: SECOND_CHAIN, [THIRD_CHAIN.chainId]: THIRD_CHAIN },
          ],
          [networkModel.$connections, {}],
          [
            networkModel.$connectionStatuses,
            {
              [CHAIN.chainId]: ConnectionStatus.CONNECTED,
              [SECOND_CHAIN.chainId]: ConnectionStatus.CONNECTED,
              [THIRD_CHAIN.chainId]: ConnectionStatus.CONNECTED,
            },
          ],
        ],
      });
      const wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;
      const hook = renderHook(() => useBalanceCoverage([ACCOUNT_A]), { wrapper });

      // The second visible account's chain has not answered yet.
      expect(hook.result.current).toEqual({ ready: false, syncing: true, missingCount: 0 });

      // The hidden wallet's chain is never requested, so it is never awaited.
      await land(scope, [record(ACCOUNT_A), record(ACCOUNT_A, SECOND_CHAIN.chainId)]);
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(hook.result.current).toEqual({ ready: true, syncing: false, missingCount: 0 });
    });
  });
});
