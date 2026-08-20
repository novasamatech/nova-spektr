import { fireEvent, render, screen } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';

import { CHAIN_SYNC_TOAST_ID, ChainSyncToastContent, useChainSyncToast } from './ChainSyncToast';

const stores = vi.hoisted(() => ({
  isChainSyncing: Symbol('isChainSyncing'),
  chainSyncState: Symbol('chainSyncState'),
}));

const testState = vi.hoisted(() => ({
  isSyncing: false,
  syncState: { expected: [] as ChainId[], fetched: [] as ChainId[] },
  custom: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('effector-react', () => ({
  useUnit: (store: unknown) => (store === stores.isChainSyncing ? testState.isSyncing : testState.syncState),
}));
vi.mock('sonner', () => ({ toast: { custom: testState.custom, dismiss: testState.dismiss } }));
vi.mock('@/shared/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@/shared/ui', () => ({
  FootnoteText: ({ children }: PropsWithChildren) => <span>{children}</span>,
  Icon: () => null,
  Loader: () => null,
}));
vi.mock('@/entities/chain', () => ({ ChainTitle: ({ chainId }: { chainId: string }) => <span>{chainId}</span> }));
vi.mock('../model/context', () => ({
  operationsContextModel: {
    $isChainSyncing: stores.isChainSyncing,
    $chainSyncState: stores.chainSyncState,
  },
}));

const Harness = () => {
  useChainSyncToast();

  return null;
};

describe('useChainSyncToast', () => {
  beforeEach(() => {
    testState.custom.mockReset();
    testState.dismiss.mockReset();
    testState.isSyncing = false;
    testState.syncState = { expected: [], fetched: [] };
  });

  it('shows a persistent toast while chains are still syncing', () => {
    testState.isSyncing = true;
    render(<Harness />);

    expect(testState.custom).toHaveBeenCalledTimes(1);
    expect(testState.custom.mock.calls[0]?.[1]).toMatchObject({ id: CHAIN_SYNC_TOAST_ID, duration: Infinity });
    expect(testState.dismiss).not.toHaveBeenCalled();
  });

  it('does not recreate the toast on progress ticks', () => {
    testState.isSyncing = true;
    testState.syncState = { expected: ['0x01', '0x02'] as ChainId[], fetched: [] as ChainId[] };
    const { rerender } = render(<Harness />);

    testState.syncState = { expected: ['0x01', '0x02'] as ChainId[], fetched: ['0x01'] as ChainId[] };
    rerender(<Harness />);

    expect(testState.custom).toHaveBeenCalledTimes(1);
  });

  it('does not show the toast when nothing is syncing', () => {
    testState.isSyncing = false;
    render(<Harness />);

    expect(testState.custom).not.toHaveBeenCalled();
  });

  it('dismisses the toast once syncing is over', () => {
    testState.isSyncing = true;
    const { rerender } = render(<Harness />);

    testState.isSyncing = false;
    rerender(<Harness />);

    expect(testState.dismiss).toHaveBeenCalledWith(CHAIN_SYNC_TOAST_ID);
  });

  it('dismisses the toast when the view unmounts', () => {
    testState.isSyncing = true;
    const { unmount } = render(<Harness />);
    unmount();

    expect(testState.dismiss).toHaveBeenCalledWith(CHAIN_SYNC_TOAST_ID);
  });
});

describe('ChainSyncToastContent', () => {
  it('reports connecting while no chain is expected yet', () => {
    testState.syncState = { expected: [], fetched: [] };
    render(<ChainSyncToastContent />);

    expect(screen.getByText('operations.sync.connecting')).toBeInTheDocument();
  });

  it('reports progress and reveals the per-chain list on toggle', () => {
    testState.syncState = { expected: ['0x01', '0x02'] as ChainId[], fetched: ['0x01'] as ChainId[] };
    render(<ChainSyncToastContent />);

    expect(screen.getByText('operations.sync.syncing')).toBeInTheDocument();

    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('0x01')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('0x01')).toBeInTheDocument();
    expect(screen.getByText('operations.sync.synced')).toBeInTheDocument();
    expect(screen.getByText('0x02')).toBeInTheDocument();
    expect(screen.getByText('operations.sync.loading')).toBeInTheDocument();
  });
});
