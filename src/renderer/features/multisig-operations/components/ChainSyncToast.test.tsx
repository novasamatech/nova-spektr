import { fireEvent, render, screen } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';

import { CHAIN_SYNC_TOAST_ID, ChainSyncToastContent, useChainSyncToast } from './ChainSyncToast';

const stores = vi.hoisted(() => ({
  isSyncToastVisible: Symbol('isSyncToastVisible'),
  chainSyncState: Symbol('chainSyncState'),
}));

const testState = vi.hoisted(() => ({
  isVisible: false,
  syncState: { expected: [] as ChainId[], fetched: [] as ChainId[] },
  custom: vi.fn(),
  dismiss: vi.fn(),
  syncToastDismissed: vi.fn(),
}));

vi.mock('effector-react', () => ({
  useUnit: (store: unknown) => (store === stores.isSyncToastVisible ? testState.isVisible : testState.syncState),
}));
vi.mock('sonner', () => ({ toast: { custom: testState.custom, dismiss: testState.dismiss } }));
vi.mock('@/shared/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@/shared/ui', () => ({
  FootnoteText: ({ children }: PropsWithChildren) => <span>{children}</span>,
  Icon: () => null,
  IconButton: ({ ariaLabel, onClick }: { ariaLabel: string; onClick: () => void }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick} />
  ),
  Loader: () => null,
}));
vi.mock('@/shared/ui-kit', () => ({ TOAST_WIDTH: 356 }));
vi.mock('@/entities/chain', () => ({ ChainTitle: ({ chainId }: { chainId: string }) => <span>{chainId}</span> }));
vi.mock('../model/context', () => ({
  operationsContextModel: {
    $isSyncToastVisible: stores.isSyncToastVisible,
    $chainSyncState: stores.chainSyncState,
    syncToastDismissed: testState.syncToastDismissed,
  },
}));

const Harness = () => {
  useChainSyncToast();

  return null;
};

const getToggle = () => screen.getByRole('button', { name: 'operations.sync.syncing' });
const getCloseButton = () => screen.getByRole('button', { name: 'general.button.closeButton' });

describe('useChainSyncToast', () => {
  beforeEach(() => {
    testState.custom.mockReset();
    testState.dismiss.mockReset();
    testState.syncToastDismissed.mockReset();
    testState.isVisible = false;
    testState.syncState = { expected: [], fetched: [] };
  });

  it('shows a persistent toast while chains are still syncing', () => {
    testState.isVisible = true;
    render(<Harness />);

    expect(testState.custom).toHaveBeenCalledTimes(1);
    expect(testState.custom.mock.calls[0]?.[1]).toMatchObject({
      id: CHAIN_SYNC_TOAST_ID,
      duration: Infinity,
      dismissible: false,
    });
    expect(testState.dismiss).not.toHaveBeenCalled();
  });

  it('does not recreate the toast on progress ticks', () => {
    testState.isVisible = true;
    testState.syncState = { expected: ['0x01', '0x02'] as ChainId[], fetched: [] as ChainId[] };
    const { rerender } = render(<Harness />);

    testState.syncState = { expected: ['0x01', '0x02'] as ChainId[], fetched: ['0x01'] as ChainId[] };
    rerender(<Harness />);

    expect(testState.custom).toHaveBeenCalledTimes(1);
  });

  it('does not show the toast when nothing is syncing or the user has closed it', () => {
    testState.isVisible = false;
    const { unmount } = render(<Harness />);
    unmount();

    // A remount while the model still reports "closed" must not bring the toast back.
    render(<Harness />);

    expect(testState.custom).not.toHaveBeenCalled();
  });

  it('dismisses the toast once syncing is over or the user closes it', () => {
    testState.isVisible = true;
    const { rerender } = render(<Harness />);

    testState.isVisible = false;
    rerender(<Harness />);

    expect(testState.dismiss).toHaveBeenCalledWith(CHAIN_SYNC_TOAST_ID);
  });

  it('dismisses the toast when the view unmounts', () => {
    testState.isVisible = true;
    const { unmount } = render(<Harness />);
    unmount();

    expect(testState.dismiss).toHaveBeenCalledWith(CHAIN_SYNC_TOAST_ID);
  });
});

describe('ChainSyncToastContent', () => {
  beforeEach(() => {
    testState.dismiss.mockReset();
    testState.syncToastDismissed.mockReset();
  });

  it('reports connecting while no chain is expected yet', () => {
    testState.syncState = { expected: [], fetched: [] };
    render(<ChainSyncToastContent />);

    expect(screen.getByText('operations.sync.connecting')).toBeInTheDocument();
  });

  it('reports progress and reveals the per-chain list on hover, then keeps it open when pinned by click', () => {
    testState.syncState = { expected: ['0x01', '0x02'] as ChainId[], fetched: ['0x01'] as ChainId[] };
    const { container } = render(<ChainSyncToastContent />);

    expect(screen.getByText('operations.sync.syncing')).toBeInTheDocument();

    const card = container.firstElementChild as HTMLElement;
    const toggle = getToggle();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('0x01')).not.toBeInTheDocument();

    fireEvent.mouseEnter(card);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('0x01')).toBeInTheDocument();
    expect(screen.getByText('operations.sync.synced')).toBeInTheDocument();
    expect(screen.getByText('0x02')).toBeInTheDocument();
    expect(screen.getByText('operations.sync.loading')).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseLeave(card);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('0x01')).toBeInTheDocument();

    fireEvent.click(toggle);
    fireEvent.mouseLeave(card);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('0x01')).not.toBeInTheDocument();
  });

  it('renders no toggle control when no chain is expected yet, only the close button', () => {
    testState.syncState = { expected: [], fetched: [] };
    render(<ChainSyncToastContent />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(getCloseButton()).toBeInTheDocument();
  });

  it('reports a manual close to the model instead of dismissing the toast itself', () => {
    testState.syncState = { expected: ['0x01'] as ChainId[], fetched: [] };
    render(<ChainSyncToastContent />);

    fireEvent.click(getCloseButton());

    expect(testState.syncToastDismissed).toHaveBeenCalledTimes(1);
    expect(testState.dismiss).not.toHaveBeenCalled();
  });

  it('drops aria-controls while collapsed and points it at the list while open', () => {
    testState.syncState = { expected: ['0x01'] as ChainId[], fetched: [] };
    const { container } = render(<ChainSyncToastContent />);

    const card = container.firstElementChild as HTMLElement;
    const toggle = getToggle();
    expect(toggle).not.toHaveAttribute('aria-controls');

    fireEvent.mouseEnter(card);

    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    expect(toggle).toHaveAttribute('aria-controls', list!.id);

    fireEvent.mouseLeave(card);

    expect(toggle).not.toHaveAttribute('aria-controls');
  });
});
