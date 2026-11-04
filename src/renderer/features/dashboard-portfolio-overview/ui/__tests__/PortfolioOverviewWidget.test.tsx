import { act, render, screen } from '@testing-library/react';
import { type Scope, allSettled, fork } from 'effector';
import { Provider } from 'effector-react';

import { type Balance, type Chain } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { CHAIN_ANSWER_DEADLINE_MS } from '@/shared/lib/utils';
import { ThemeProvider } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { PortfolioOverviewWidget } from '../PortfolioOverviewWidget';

// The bound `useBalanceCoverage` puts on the wait — the chain-answer deadline.
const BALANCE_COVERAGE_TIMEOUT_MS = CHAIN_ANSWER_DEADLINE_MS;

// Prices come over HTTP; an empty, resolved price map is enough for the widget
// to leave its price-loading skeleton and judge the balances it has.
vi.mock('@/domains/price', async (importOriginal) => ({
  ...(await importOriginal()),
  useAssetsPrices: () => ({ data: {}, pending: false }),
}));

const WALLET_ACCOUNT = `0x${'a'.repeat(64)}`;
const CONTACT = `0x${'b'.repeat(64)}`;

const CHAIN = { chainId: '0x01', name: 'Enabled', options: [], assets: [] } as unknown as Chain;

const record = (accountId: string): Balance => ({ id: accountId, accountId }) as unknown as Balance;
const walletAccount = (accountId: string): AnyAccount => ({ accountId }) as unknown as AnyAccount;
const toMap = (balances: Balance[]) => Object.fromEntries(balances.map((balance) => [balance.id, balance]));

const NO_TOKENS = 'No tokens to show';

const setup = (selection: string[], balances: Balance[]) => {
  const scope = fork({
    values: [
      [balanceModel.__test.$balanceMap, toMap(balances)],
      [accounts.__test.$list, [walletAccount(WALLET_ACCOUNT)]],
      [networkModel.$chains, { [CHAIN.chainId]: CHAIN }],
      [networkModel.$connections, {}],
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
});
