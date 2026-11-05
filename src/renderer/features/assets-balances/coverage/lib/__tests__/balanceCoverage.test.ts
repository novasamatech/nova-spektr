import {
  type Balance,
  type Chain,
  type ChainId,
  type Connection,
  ChainOptions,
  ConnectionStatus,
  ConnectionType,
} from '@/shared/core';
import { type AnyAccount, accountService } from '@/domains/network';
import { getAwaitedChains, getBalanceCoverage, getChainStates, getRequestedChains } from '../balanceCoverage';

const SUBSTRATE_A = `0x${'a'.repeat(64)}`;
const SUBSTRATE_B = `0x${'b'.repeat(64)}`;
const SUBSTRATE_C = `0x${'c'.repeat(64)}`;
const ETHEREUM = `0x${'e'.repeat(40)}`;

const CHAIN_1: ChainId = '0x01';
const CHAIN_2: ChainId = '0x02';

const record = (accountId: string, chainId: ChainId = CHAIN_1): Balance =>
  ({ accountId, chainId }) as unknown as Balance;
const chain = (chainId: ChainId, options: ChainOptions[] = []): Chain =>
  ({ chainId, options, assets: [{ assetId: 0 }] }) as unknown as Chain;
const walletAccount = (accountId: string): AnyAccount => ({ accountId }) as unknown as AnyAccount;
const connection = (chainId: ChainId, connectionType: ConnectionType): Connection =>
  ({ chainId, connectionType }) as unknown as Connection;
const requestedOn = (entries: [string, ChainId[]][]) =>
  new Map(entries.map(([accountId, chainIds]) => [accountId, new Set(chainIds)]));

const NO_CONNECTIONS = {};

const ALL = requestedOn([
  [SUBSTRATE_A, [CHAIN_1]],
  [SUBSTRATE_B, [CHAIN_1]],
  [SUBSTRATE_C, [CHAIN_1]],
]);
const BOTH_CHAINS = requestedOn([
  [SUBSTRATE_A, [CHAIN_1, CHAIN_2]],
  [SUBSTRATE_B, [CHAIN_1, CHAIN_2]],
]);

describe('getBalanceCoverage', () => {
  test('is incomplete before any balance has landed', () => {
    expect(getBalanceCoverage([], [SUBSTRATE_A], ALL)).toEqual({ complete: false, awaiting: [SUBSTRATE_A] });
  });

  test('one answered account does not stand in for the rest of the selection', () => {
    const coverage = getBalanceCoverage([record(SUBSTRATE_A)], [SUBSTRATE_A, SUBSTRATE_B, SUBSTRATE_C], ALL);

    expect(coverage).toEqual({ complete: false, awaiting: [SUBSTRATE_B, SUBSTRATE_C] });
  });

  test('is complete once every selected account has a record, zero balances included', () => {
    const balances = [record(SUBSTRATE_A), record(SUBSTRATE_B), record(SUBSTRATE_C)];

    expect(getBalanceCoverage(balances, [SUBSTRATE_A, SUBSTRATE_B, SUBSTRATE_C], ALL)).toEqual({
      complete: true,
      awaiting: [],
    });
  });

  test('one answered chain does not stand in for another connected chain', () => {
    const balances = [record(SUBSTRATE_A, CHAIN_1), record(SUBSTRATE_B, CHAIN_1)];

    expect(getBalanceCoverage(balances, [SUBSTRATE_A, SUBSTRATE_B], BOTH_CHAINS)).toEqual({
      complete: false,
      awaiting: [SUBSTRATE_A, SUBSTRATE_B],
    });
  });

  test('keeps waiting for the account whose record on the second chain has not landed', () => {
    const balances = [record(SUBSTRATE_A, CHAIN_1), record(SUBSTRATE_B, CHAIN_1), record(SUBSTRATE_A, CHAIN_2)];

    expect(getBalanceCoverage(balances, [SUBSTRATE_A, SUBSTRATE_B], BOTH_CHAINS)).toEqual({
      complete: false,
      awaiting: [SUBSTRATE_B],
    });
  });

  test('becomes complete exactly when the last (account, chain) pair lands', () => {
    const arrivals = [
      record(SUBSTRATE_A, CHAIN_1),
      record(SUBSTRATE_B, CHAIN_2),
      record(SUBSTRATE_A, CHAIN_2),
      record(SUBSTRATE_B, CHAIN_1),
    ];
    const selection = [SUBSTRATE_A, SUBSTRATE_B];

    const steps = arrivals.map((_, index) => getBalanceCoverage(arrivals.slice(0, index + 1), selection, BOTH_CHAINS));

    expect(steps.map((coverage) => coverage.complete)).toEqual([false, false, false, true]);
    expect(steps.map((coverage) => coverage.awaiting)).toEqual([
      [SUBSTRATE_A, SUBSTRATE_B],
      [SUBSTRATE_A, SUBSTRATE_B],
      [SUBSTRATE_B],
      [],
    ]);
  });

  test('several records of one (account, chain) pair cover it once', () => {
    const balances = [record(SUBSTRATE_A, CHAIN_1), record(SUBSTRATE_A, CHAIN_1), record(SUBSTRATE_B, CHAIN_1)];

    expect(getBalanceCoverage(balances, [SUBSTRATE_A, SUBSTRATE_B], BOTH_CHAINS)).toEqual({
      complete: false,
      awaiting: [SUBSTRATE_A, SUBSTRATE_B],
    });
  });

  test('a record on a chain the account is not awaited on covers nothing', () => {
    const coverage = getBalanceCoverage([record(SUBSTRATE_A, CHAIN_2)], [SUBSTRATE_A], ALL);

    expect(coverage).toEqual({ complete: false, awaiting: [SUBSTRATE_A] });
  });

  test('a record kept from an earlier session answers while no chain is connected yet', () => {
    expect(getBalanceCoverage([record(SUBSTRATE_A, CHAIN_2)], [SUBSTRATE_A], new Map())).toEqual({
      complete: true,
      awaiting: [],
    });
  });

  test('does not wait for an account that fits no chain', () => {
    const coverage = getBalanceCoverage(
      [record(SUBSTRATE_A)],
      [SUBSTRATE_A, SUBSTRATE_B],
      requestedOn([[SUBSTRATE_A, [CHAIN_1]]]),
    );

    expect(coverage).toEqual({ complete: true, awaiting: [] });
  });

  test('still needs at least one record when no account fits any chain', () => {
    // Chains not loaded yet: nothing is expected, but nothing was read either —
    // this must not read as "looked, and there is nothing".
    expect(getBalanceCoverage([], [SUBSTRATE_A], new Map())).toEqual({ complete: false, awaiting: [] });
  });

  test('ignores records belonging to accounts outside the selection', () => {
    expect(getBalanceCoverage([record(SUBSTRATE_B)], [SUBSTRATE_A], ALL)).toEqual({
      complete: false,
      awaiting: [SUBSTRATE_A],
    });
  });

  test('stops scanning once every awaited (account, chain) pair has a record', () => {
    const balances = [record(SUBSTRATE_A, CHAIN_1), record(SUBSTRATE_A, CHAIN_2), record(SUBSTRATE_B, CHAIN_1)];
    let visited = 0;
    const lazy: Iterable<Balance> = {
      *[Symbol.iterator]() {
        for (const balance of balances) {
          visited += 1;
          yield balance;
        }
      },
    };

    const coverage = getBalanceCoverage(lazy, [SUBSTRATE_A], requestedOn([[SUBSTRATE_A, [CHAIN_1, CHAIN_2]]]));

    expect(coverage).toEqual({ complete: true, awaiting: [] });
    expect(visited).toBe(2);
  });

  test('is incomplete for an empty selection', () => {
    expect(getBalanceCoverage([record(SUBSTRATE_A)], [], ALL)).toEqual({ complete: false, awaiting: [] });
  });
});

describe('getRequestedChains', () => {
  const substrate = chain('0x0a');
  const evm = chain('0x0e', [ChainOptions.ETHEREUM_BASED]);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('matches an account without a wallet account (a contact) by address scheme', () => {
    expect(getRequestedChains([SUBSTRATE_A, ETHEREUM], [], [substrate, evm], NO_CONNECTIONS)).toEqual(
      new Map([
        [substrate.chainId, [SUBSTRATE_A]],
        [evm.chainId, [ETHEREUM]],
      ]),
    );
  });

  test('matches a wallet account by chain availability', () => {
    vi.spyOn(accountService, 'isAccountAvailableOnChain').mockImplementation(
      (account) => account.accountId === SUBSTRATE_A,
    );

    const result = getRequestedChains(
      [SUBSTRATE_A, SUBSTRATE_B],
      [walletAccount(SUBSTRATE_A), walletAccount(SUBSTRATE_B)],
      [substrate],
      NO_CONNECTIONS,
    );

    expect(result).toEqual(new Map([[substrate.chainId, [SUBSTRATE_A]]]));
  });

  test('requests a key that exists as several accounts on the chains of all of them', () => {
    const second = chain('0x0b');
    const scoped = (chainId: ChainId): AnyAccount => ({ accountId: SUBSTRATE_A, chainId }) as unknown as AnyAccount;
    vi.spyOn(accountService, 'isAccountAvailableOnChain').mockImplementation(
      (account, target) => 'chainId' in account && account.chainId === target.chainId,
    );

    const result = getRequestedChains(
      [SUBSTRATE_A],
      [scoped(substrate.chainId), scoped(second.chainId)],
      [substrate, second],
      NO_CONNECTIONS,
    );

    expect(result).toEqual(
      new Map([
        [substrate.chainId, [SUBSTRATE_A]],
        [second.chainId, [SUBSTRATE_A]],
      ]),
    );
  });

  test('matches nothing before chains are known', () => {
    expect(getRequestedChains([SUBSTRATE_A], [], [], NO_CONNECTIONS)).toEqual(new Map());
  });

  test('ignores a disabled chain', () => {
    const disabled = chain('0x0d');
    const connections = { [disabled.chainId]: connection(disabled.chainId, ConnectionType.DISABLED) };

    expect(getRequestedChains([SUBSTRATE_A], [], [substrate, disabled], connections)).toEqual(
      new Map([[substrate.chainId, [SUBSTRATE_A]]]),
    );
  });

  test('ignores a chain without assets', () => {
    // No asset, no balance record: there is nothing such a chain could answer with.
    const assetless = { chainId: '0x0b', options: [], assets: [] } as unknown as Chain;

    expect(getRequestedChains([SUBSTRATE_A], [], [substrate, assetless], NO_CONNECTIONS)).toEqual(
      new Map([[substrate.chainId, [SUBSTRATE_A]]]),
    );
  });
});

describe('getChainStates', () => {
  const REQUESTED = new Map<ChainId, string[]>([
    [CHAIN_1, [SUBSTRATE_A]],
    [CHAIN_2, [SUBSTRATE_A]],
  ]);

  test('lists the connected requested chains', () => {
    const statuses = { [CHAIN_1]: ConnectionStatus.CONNECTED, [CHAIN_2]: ConnectionStatus.CONNECTED };

    expect(getChainStates(REQUESTED, statuses)).toEqual({ connected: [CHAIN_1, CHAIN_2], connecting: false });
  });

  test('reports a connecting requested chain without listing it', () => {
    const statuses = { [CHAIN_1]: ConnectionStatus.CONNECTED, [CHAIN_2]: ConnectionStatus.CONNECTING };

    expect(getChainStates(REQUESTED, statuses)).toEqual({ connected: [CHAIN_1], connecting: true });
  });

  test.each([
    ['disconnected', ConnectionStatus.DISCONNECTED],
    ['failing', ConnectionStatus.ERROR],
    ['without a status yet', undefined],
  ])('a chain that is %s is neither listed nor reported as connecting', (_, status) => {
    const statuses = { [CHAIN_1]: ConnectionStatus.CONNECTED, ...(status ? { [CHAIN_2]: status } : {}) };

    expect(getChainStates(REQUESTED, statuses)).toEqual({ connected: [CHAIN_1], connecting: false });
  });

  test('a connecting chain the selection is not requested on is not reported', () => {
    const statuses = { [CHAIN_1]: ConnectionStatus.CONNECTED, '0x09': ConnectionStatus.CONNECTING };

    expect(getChainStates(new Map([[CHAIN_1, [SUBSTRATE_A]]]), statuses)).toEqual({
      connected: [CHAIN_1],
      connecting: false,
    });
  });
});

describe('getAwaitedChains', () => {
  const REQUESTED = new Map<ChainId, string[]>([
    [CHAIN_1, [SUBSTRATE_A, SUBSTRATE_B]],
    [CHAIN_2, [SUBSTRATE_A]],
  ]);

  test('pairs every account with the connected chains it is requested on', () => {
    expect(getAwaitedChains(REQUESTED, [CHAIN_1, CHAIN_2])).toEqual(
      requestedOn([
        [SUBSTRATE_A, [CHAIN_1, CHAIN_2]],
        [SUBSTRATE_B, [CHAIN_1]],
      ]),
    );
  });

  test('an account requested on no connected chain is not awaited', () => {
    expect(getAwaitedChains(REQUESTED, [CHAIN_2])).toEqual(requestedOn([[SUBSTRATE_A, [CHAIN_2]]]));
  });
});
