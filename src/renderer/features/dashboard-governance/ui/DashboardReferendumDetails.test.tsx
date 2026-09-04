import { type ApiPromise } from '@polkadot/api';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type Scope, fork, scopeBind } from 'effector';
import { Provider } from 'effector-react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ChainId, type ReferendumId } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { kusamaChain, kusamaChainId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import type * as GovernanceEntities from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { networkSelectorModel } from '@/features/governance';

import { DashboardReferendumDetails, NETWORK_WAIT_TIMEOUT_MS } from './DashboardReferendumDetails';

/**
 * A referendum id the page never resolves — the modal then keeps spinning.
 * Hoisted with the mock that reads it, which runs before the module body.
 */
const { UNREACHABLE_REFERENDUM_ID } = vi.hoisted(() => ({ UNREACHABLE_REFERENDUM_ID: '404' }));

// The page's referendum modal drags the whole Governance page behind it. The
// adapter's job is what happens around it — which chain is selected, when the
// body is allowed to mount, what the wait says, and the chain badge it dresses
// the modal with — so it stands in as a marker that shows all of them.
vi.mock('@/pages/Governance', () => ({
  GovernanceReferendumDetailsModal: ({ chainId, titleBadge }: { chainId: ChainId; titleBadge: ReactNode }) => (
    <div data-testid="details-body" data-chain={chainId}>
      {titleBadge}
    </div>
  ),
  useReferendum: (referendumId: ReferendumId) => (referendumId === UNREACHABLE_REFERENDUM_ID ? null : { referendumId }),
}));

// A resolved network is what the governance list aggregate subscribes on, and
// the subscription talks to a real node. The adapter's behaviour is upstream of
// it, so the subscription is cut loose — otherwise the fake api leaves a
// rejected promise behind every test that lets the network resolve. This works
// because `features/governance/aggregates/list.ts` reaches `referendumModel`
// through this barrel; a deep import there would reinstate the live subscription.
vi.mock('@/entities/governance', async (importOriginal) => {
  const { createEvent } = await import('effector');
  const actual = await importOriginal<typeof GovernanceEntities>();

  return {
    ...actual,
    referendumModel: {
      ...actual.referendumModel,
      events: { ...actual.referendumModel.events, subscribeReferendums: createEvent() },
    },
  };
});

// Only its presence in `$apis` matters here: `$network` resolves once the
// selected chain has one.
const api: ApiPromise = { isConnected: true } as unknown as ApiPromise;

type ScopeOptions = {
  /** The chain the user had selected before the dashboard borrowed the selector. */
  previousChainId?: ChainId | null;
  /** Chains with a live api — an empty list leaves `$network` unresolved. */
  connected?: ChainId[];
};

const createScope = ({ previousChainId = kusamaChainId, connected = [polkadotChainId] }: ScopeOptions = {}): Scope =>
  fork({
    values: [
      [networkModel.$chains, { [polkadotChainId]: polkadotChain, [kusamaChainId]: kusamaChain }],
      [networkModel.$apis, Object.fromEntries(connected.map((chainId) => [chainId, api]))],
      [networkSelectorModel.$governanceChainId, previousChainId],
    ],
  });

// The row always opens on Polkadot; the scope says what the selector held before.
const renderDetails = (scope: Scope, referendumId: ReferendumId = '42') => {
  const onClose = vi.fn();

  const view = render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <DashboardReferendumDetails chainId={polkadotChainId} referendumId={referendumId} onClose={onClose} />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );

  return { ...view, onClose };
};

const selectedChainId = (scope: Scope) => scope.getState(networkSelectorModel.$governanceChainId);

const loadingHint = /Taking longer than usual/;

const waitOut = (ms = NETWORK_WAIT_TIMEOUT_MS) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

afterEach(() => {
  vi.useRealTimers();
});

describe('features/dashboard-governance/ui/DashboardReferendumDetails', () => {
  it("selects the row's chain and mounts the details on it", () => {
    const scope = createScope();
    renderDetails(scope);

    expect(selectedChainId(scope)).toEqual(polkadotChainId);
    expect(screen.getByTestId('details-body')).toHaveAttribute('data-chain', polkadotChainId);
    // Opened from a mixed-chain list, the modal has to name its own chain.
    expect(screen.getByText('Polkadot')).toBeInTheDocument();
  });

  it('holds the details back while the chain has no resolved network', () => {
    const scope = createScope({ connected: [] });
    renderDetails(scope);

    // The selection is made regardless — it is what the network resolves from.
    expect(selectedChainId(scope)).toEqual(polkadotChainId);
    expect(screen.queryByTestId('details-body')).toBeNull();
    expect(screen.getByTestId('Icon:loader')).toBeInTheDocument();
  });

  it('takes the details back down if the selector moves to another chain', () => {
    const scope = createScope({ connected: [polkadotChainId, kusamaChainId] });
    renderDetails(scope);

    expect(screen.getByTestId('details-body')).toBeInTheDocument();

    act(() => {
      scopeBind(networkSelectorModel.events.selectNetwork, { scope })(kusamaChainId);
    });

    expect(screen.queryByTestId('details-body')).toBeNull();
  });

  it('puts the previously selected chain back once it is closed', () => {
    vi.useFakeTimers();
    const scope = createScope({ previousChainId: kusamaChainId });
    const { unmount } = renderDetails(scope);

    expect(selectedChainId(scope)).toEqual(polkadotChainId);

    unmount();
    // The restore is deferred, so the child's own unmount runs with the modal's
    // chain still selected.
    expect(selectedChainId(scope)).toEqual(polkadotChainId);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(selectedChainId(scope)).toEqual(kusamaChainId);
  });

  it('leaves the selection on the row chain when there was nothing to go back to', () => {
    vi.useFakeTimers();
    const scope = createScope({ previousChainId: null });
    const { unmount } = renderDetails(scope);

    unmount();

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(selectedChainId(scope)).toEqual(polkadotChainId);
  });

  it('lets the user out of a wait that is going nowhere', () => {
    const { onClose } = renderDetails(createScope({ connected: [] }));

    expect(screen.getByTestId('Modal')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('leaves the spinner unexplained until the wait is out', () => {
    vi.useFakeTimers();
    renderDetails(createScope({ connected: [] }));

    waitOut(NETWORK_WAIT_TIMEOUT_MS - 1);

    // Still spinning, just without an excuse for it yet.
    expect(screen.getByTestId('Icon:loader')).toBeInTheDocument();
    expect(screen.queryByText(loadingHint)).toBeNull();
  });

  it('says the wait is not normal once it is out and the network never came up', () => {
    vi.useFakeTimers();
    renderDetails(createScope({ connected: [] }));

    waitOut();

    expect(screen.getByText(loadingHint)).toBeInTheDocument();
  });

  it('says the same when the chain is up but the referendum never arrives', () => {
    vi.useFakeTimers();
    renderDetails(createScope(), UNREACHABLE_REFERENDUM_ID);

    expect(screen.queryByTestId('details-body')).toBeNull();

    waitOut();

    expect(screen.getByText(loadingHint)).toBeInTheDocument();
  });

  it('spends the wait harmlessly once the details are up', () => {
    vi.useFakeTimers();
    renderDetails(createScope());

    waitOut(NETWORK_WAIT_TIMEOUT_MS * 2);

    expect(screen.queryByText(loadingHint)).toBeNull();
    expect(screen.getByTestId('details-body')).toBeInTheDocument();
  });
});
