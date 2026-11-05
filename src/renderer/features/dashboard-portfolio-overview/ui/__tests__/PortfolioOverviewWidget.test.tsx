import { BN } from '@polkadot/util';
import { act, render, screen } from '@testing-library/react';
import { type Scope, allSettled, fork } from 'effector';
import { Provider } from 'effector-react';

import { type Balance, type Chain, type ChainId, ConnectionStatus } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { CHAIN_ANSWER_DEADLINE_MS } from '@/shared/lib/utils';
import { ThemeProvider } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { PortfolioOverviewWidget } from '../PortfolioOverviewWidget';

// The bound `useBalanceCoverage` puts on the wait — the chain-answer deadline.
const BALANCE_COVERAGE_TIMEOUT_MS = CHAIN_ANSWER_DEADLINE_MS;

// Prices come over HTTP; a resolved price map is enough for the widget to leave
// its price-loading skeleton and judge the balances it has. Empty unless a test
// prices an asset.
const mockedPrices = vi.hoisted(() => ({ current: {} as Record<string, Record<string, { price: number }>> }));
vi.mock('@/domains/price', async (importOriginal) => ({
  ...(await importOriginal()),
  useAssetsPrices: () => ({ data: mockedPrices.current, pending: false }),
}));

const WALLET_ACCOUNT = `0x${'a'.repeat(64)}`;
const CONTACT = `0x${'b'.repeat(64)}`;

// The records below carry no asset id, so they never become holdings: these
// tests are about what the card says while balances are arriving.
const ASSETS = [{ assetId: 0 }];
const CHAIN = { chainId: '0x01', name: 'Enabled', options: [], assets: ASSETS } as unknown as Chain;
const SECOND_CHAIN = { chainId: '0x02', name: 'Second', options: [], assets: ASSETS } as unknown as Chain;
const ASSETLESS_CHAIN = { chainId: '0x02', name: 'Assetless', options: [], assets: [] } as unknown as Chain;

const record = (accountId: string, chainId: ChainId = CHAIN.chainId): Balance =>
  ({ id: `${accountId}-${chainId}`, accountId, chainId }) as unknown as Balance;
const walletAccount = (accountId: string): AnyAccount => ({ accountId }) as unknown as AnyAccount;
const toMap = (balances: Balance[]) => Object.fromEntries(balances.map((balance) => [balance.id, balance]));

const NO_TOKENS = 'No tokens to show';
const SYNCING = 'Syncing balances...';
const NOT_LOADED = /have not loaded yet/;

/**
 * `secondChainStatus` adds a second enabled chain in that connection state;
 * without it the only chain is the connected one.
 */
const setup = (
  selection: string[],
  balances: Balance[],
  secondChainStatus?: ConnectionStatus,
  secondChain: Chain = SECOND_CHAIN,
  firstChain: Chain = CHAIN,
) => {
  const scope = fork({
    values: [
      [balanceModel.__test.$balanceMap, toMap(balances)],
      [accounts.__test.$list, [walletAccount(WALLET_ACCOUNT)]],
      [
        networkModel.$chains,
        { [CHAIN.chainId]: firstChain, ...(secondChainStatus ? { [secondChain.chainId]: secondChain } : {}) },
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

  const entries = selection.map((accountId) => ({ accountId, name: accountId, address: accountId }));
  const view = render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <PortfolioOverviewWidget accountIds={selection} allEntries={entries} />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );

  return { scope, view };
};

const land = async (scope: Scope, balances: Balance[]) => {
  await act(() => allSettled(balanceModel.__test.$balanceMap, { scope, params: toMap(balances) }));
};

const skeletonCount = (container: HTMLElement) =>
  container.querySelectorAll('.spektr-skeleton:not([data-testid]):empty').length;

describe('features/dashboard-portfolio-overview/ui/PortfolioOverviewWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(accountService, 'isAccountAvailableOnChain').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    mockedPrices.current = {};
  });

  it('SP-26: shows the loading state, not "No tokens", until every selected account has a balance record', async () => {
    const { scope, view } = setup([WALLET_ACCOUNT], []);

    expect(skeletonCount(view.container)).toBeGreaterThan(0);
    expect(screen.queryByText(NO_TOKENS)).not.toBeInTheDocument();

    await land(scope, [record(WALLET_ACCOUNT)]);

    expect(skeletonCount(view.container)).toBe(0);
    expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
  });

  it('SP-27: a contact without a balance record keeps the loading state even though the wallet account answered', async () => {
    const { scope, view } = setup([WALLET_ACCOUNT, CONTACT], [record(WALLET_ACCOUNT)]);

    expect(skeletonCount(view.container)).toBeGreaterThan(0);
    expect(screen.queryByText(NO_TOKENS)).not.toBeInTheDocument();

    await land(scope, [record(WALLET_ACCOUNT), record(CONTACT)]);

    expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
  });

  it('SP-27: a never-answering account cannot pin the loading state past the bounded wait', () => {
    const { view } = setup([WALLET_ACCOUNT, CONTACT], [record(WALLET_ACCOUNT)]);

    act(() => {
      vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS - 1);
    });
    expect(screen.queryByText(NO_TOKENS)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(skeletonCount(view.container)).toBe(0);
    expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
  });

  describe('several chains', () => {
    it('keeps the loading state until every connected chain has answered, not the first one', async () => {
      const { scope, view } = setup([WALLET_ACCOUNT], [record(WALLET_ACCOUNT)], ConnectionStatus.CONNECTED);

      expect(skeletonCount(view.container)).toBeGreaterThan(0);
      expect(screen.queryByText(NO_TOKENS)).not.toBeInTheDocument();

      await land(scope, [record(WALLET_ACCOUNT), record(WALLET_ACCOUNT, SECOND_CHAIN.chainId)]);

      expect(skeletonCount(view.container)).toBe(0);
      expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
      expect(screen.queryByText(SYNCING)).not.toBeInTheDocument();
      expect(screen.queryByText(NOT_LOADED)).not.toBeInTheDocument();
    });

    it('marks the total as partial once the wait runs out with a connected chain still unanswered', () => {
      setup(
        [WALLET_ACCOUNT, CONTACT],
        [record(WALLET_ACCOUNT), record(CONTACT), record(WALLET_ACCOUNT, SECOND_CHAIN.chainId)],
        ConnectionStatus.CONNECTED,
      );

      expect(screen.queryByText(NOT_LOADED)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });

      expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
      expect(screen.getByText('Balances of 1 account have not loaded yet')).toBeInTheDocument();
    });

    it('does not wait for a chain that is still connecting, and says balances are syncing', () => {
      const { view } = setup([WALLET_ACCOUNT], [record(WALLET_ACCOUNT)], ConnectionStatus.CONNECTING);

      expect(skeletonCount(view.container)).toBe(0);
      expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
      expect(screen.getByText(SYNCING)).toBeInTheDocument();
      expect(screen.queryByText(NOT_LOADED)).not.toBeInTheDocument();
    });

    it.each([
      ['failing', ConnectionStatus.ERROR],
      ['disconnected', ConnectionStatus.DISCONNECTED],
    ])('a chain that is %s is neither waited for nor shown as syncing', (_, status) => {
      const { view } = setup([WALLET_ACCOUNT], [record(WALLET_ACCOUNT)], status);

      expect(skeletonCount(view.container)).toBe(0);
      expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
      expect(screen.queryByText(SYNCING)).not.toBeInTheDocument();
      expect(screen.queryByText(NOT_LOADED)).not.toBeInTheDocument();
    });

    it('a connected chain without assets is not waited for', () => {
      const { view } = setup([WALLET_ACCOUNT], [record(WALLET_ACCOUNT)], ConnectionStatus.CONNECTED, ASSETLESS_CHAIN);

      expect(skeletonCount(view.container)).toBe(0);
      expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
      expect(screen.queryByText(SYNCING)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });
      expect(screen.queryByText(NOT_LOADED)).not.toBeInTheDocument();
    });

    it('keeps "No tokens" when a chain connects after it was shown: syncing first, the partial note once the wait runs out', async () => {
      const { scope, view } = setup([WALLET_ACCOUNT], [record(WALLET_ACCOUNT)], ConnectionStatus.CONNECTING);
      expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();

      await act(() =>
        allSettled(networkModel.$connectionStatuses, {
          scope,
          params: {
            [CHAIN.chainId]: ConnectionStatus.CONNECTED,
            [SECOND_CHAIN.chainId]: ConnectionStatus.CONNECTED,
          },
        }),
      );

      // The chain is connected but silent: no way back to the loading state.
      expect(skeletonCount(view.container)).toBe(0);
      expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
      expect(screen.getByText(SYNCING)).toBeInTheDocument();
      expect(screen.queryByText(NOT_LOADED)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });

      expect(screen.getByText(NO_TOKENS)).toBeInTheDocument();
      expect(screen.queryByText(SYNCING)).not.toBeInTheDocument();
      expect(screen.getByText('Balances of 1 account have not loaded yet')).toBeInTheDocument();
    });

    it('marks a populated total as partial once the wait runs out with a connected chain still unanswered', () => {
      const PRICE_ID = 'polkadot';
      const pricedChain = {
        ...CHAIN,
        assets: [{ assetId: 0, priceId: PRICE_ID, symbol: 'DOT', name: 'Polkadot', precision: 10, icon: {} }],
      } as unknown as Chain;
      mockedPrices.current = { [PRICE_ID]: { usd: { price: 5 } } };
      const funded = {
        ...record(WALLET_ACCOUNT),
        assetId: 0,
        free: new BN('10000000000'),
        reserved: new BN(0),
        frozen: new BN(0),
        locked: [],
        transferableMode: 'legacy',
      } as unknown as Balance;

      setup([WALLET_ACCOUNT], [funded], ConnectionStatus.CONNECTED, SECOND_CHAIN, pricedChain);

      // Holdings are on screen from the first answer; the second chain is still on its way.
      expect(screen.getByText('DOT')).toBeInTheDocument();
      expect(screen.queryByText(NO_TOKENS)).not.toBeInTheDocument();
      expect(screen.queryByText(NOT_LOADED)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(BALANCE_COVERAGE_TIMEOUT_MS);
      });

      expect(screen.queryByText(NO_TOKENS)).not.toBeInTheDocument();
      expect(screen.getByText('DOT')).toBeInTheDocument();
      expect(screen.getByText('Balances of 1 account have not loaded yet')).toBeInTheDocument();
    });
  });
});
