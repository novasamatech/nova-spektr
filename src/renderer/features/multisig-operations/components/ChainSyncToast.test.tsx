import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ChainId } from '@/shared/core';

import { CHAIN_SYNC_TOAST_ID, useChainSyncToast } from './ChainSyncToast';

const testState = vi.hoisted(() => ({
  syncState: { expected: [] as ChainId[], fetched: [] as ChainId[] },
  custom: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('effector-react', () => ({ useUnit: () => testState.syncState }));
vi.mock('sonner', () => ({ toast: { custom: testState.custom, dismiss: testState.dismiss } }));
vi.mock('@/shared/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@/shared/ui', () => ({ FootnoteText: () => null, Icon: () => null, Loader: () => null }));
vi.mock('@/entities/chain', () => ({ ChainTitle: () => null }));
vi.mock('../model/context', () => ({ operationsContextModel: { $chainSyncState: Symbol('sync') } }));

const Harness = () => {
  useChainSyncToast();
  return null;
};

describe('useChainSyncToast', () => {
  beforeEach(() => {
    testState.custom.mockReset();
    testState.dismiss.mockReset();
  });

  it('shows a persistent toast while chains are still syncing', () => {
    testState.syncState = { expected: ['0x01', '0x02'] as ChainId[], fetched: ['0x01'] as ChainId[] };
    render(<Harness />);

    expect(testState.custom).toHaveBeenCalledTimes(1);
    expect(testState.custom.mock.calls[0]?.[1]).toMatchObject({ id: CHAIN_SYNC_TOAST_ID, duration: Infinity });
    expect(testState.dismiss).not.toHaveBeenCalled();
  });

  it('shows the toast while still connecting (nothing expected yet)', () => {
    testState.syncState = { expected: [] as ChainId[], fetched: [] as ChainId[] };
    render(<Harness />);

    expect(testState.custom).toHaveBeenCalledTimes(1);
  });

  it('dismisses the toast once every expected chain is fetched', () => {
    testState.syncState = { expected: ['0x01'] as ChainId[], fetched: ['0x01'] as ChainId[] };
    render(<Harness />);

    expect(testState.custom).not.toHaveBeenCalled();
    expect(testState.dismiss).toHaveBeenCalledWith(CHAIN_SYNC_TOAST_ID);
  });

  it('dismisses the toast when the view unmounts', () => {
    testState.syncState = { expected: ['0x01', '0x02'] as ChainId[], fetched: [] as ChainId[] };
    const { unmount } = render(<Harness />);
    unmount();

    expect(testState.dismiss).toHaveBeenCalledWith(CHAIN_SYNC_TOAST_ID);
  });
});
