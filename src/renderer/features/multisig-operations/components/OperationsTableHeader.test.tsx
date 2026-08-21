import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COLUMN_DEFAULT_WIDTHS } from '@/shared/ui/operations-table-layout';

import { OperationsTableHeader } from './OperationsTableHeader';

if (typeof window.PointerEvent === 'undefined') {
  // jsdom has no PointerEvent; MouseEvent carries clientX which is all the handle reads.
  Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, configurable: true });
}

const testState = vi.hoisted(() => ({
  tab: 'pending' as string,
  isScopeMerged: false,
  hasEverConnected: true,
  columnResized: vi.fn(),
  columnAutofit: vi.fn(),
  resizeStarted: vi.fn(),
  resizeEnded: vi.fn(),
  sortToggled: vi.fn(),
  stores: {
    sort: Symbol('sort'),
    tab: Symbol('tab'),
    isScopeMerged: Symbol('isScopeMerged'),
    hasEverConnected: Symbol('hasEverConnected'),
  },
}));

vi.mock('effector-react', () => ({
  useUnit: (store: symbol) => {
    if (store === testState.stores.sort) return null;
    if (store === testState.stores.tab) return testState.tab;
    if (store === testState.stores.isScopeMerged) return testState.isScopeMerged;
    if (store === testState.stores.hasEverConnected) return testState.hasEverConnected;
    return undefined;
  },
}));

vi.mock('@/shared/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

vi.mock('@/aggregates/backend', () => ({
  connectionHistoryModel: { $hasEverConnected: testState.stores.hasEverConnected },
}));

vi.mock('@/aggregates/operations-table-layout', () => ({
  operationsTableLayoutModel: {
    columnResized: testState.columnResized,
    columnAutofit: testState.columnAutofit,
    resizeStarted: testState.resizeStarted,
    resizeEnded: testState.resizeEnded,
  },
  useOperationColumnWidths: () => COLUMN_DEFAULT_WIDTHS,
  useIsInitiatorColumnVisible: () => true,
}));

vi.mock('../model/context', () => ({
  operationsContextModel: {
    $sort: testState.stores.sort,
    $tab: testState.stores.tab,
    $isScopeMerged: testState.stores.isScopeMerged,
    sortToggled: testState.sortToggled,
  },
}));

describe('OperationsTableHeader', () => {
  beforeEach(() => {
    testState.tab = 'pending';
    testState.isScopeMerged = false;
    testState.columnResized.mockReset();
    testState.columnAutofit.mockReset();
    testState.resizeStarted.mockReset();
    testState.resizeEnded.mockReset();
    testState.sortToggled.mockReset();
  });

  it('captions the status and actions columns on the pending tab', () => {
    render(<OperationsTableHeader />);

    expect(screen.getByText('operations.table.signed')).toBeInTheDocument();
    expect(screen.getByText('operations.table.actions')).toBeInTheDocument();
    expect(screen.queryByText('operations.table.status')).not.toBeInTheDocument();
  });

  it('reads Status and hides Actions on the history tab', () => {
    testState.tab = 'history';
    render(<OperationsTableHeader />);

    expect(screen.getByText('operations.table.status')).toBeInTheDocument();
    expect(screen.queryByText('operations.table.signed')).not.toBeInTheDocument();
    expect(screen.queryByText('operations.table.actions')).not.toBeInTheDocument();
  });

  it('reads Status in the merged scope', () => {
    testState.isScopeMerged = true;
    render(<OperationsTableHeader />);

    expect(screen.getByText('operations.table.status')).toBeInTheDocument();
    expect(screen.getByText('operations.table.actions')).toBeInTheDocument();
  });

  it('drags a column handle into a resize without toggling the sort', () => {
    render(<OperationsTableHeader />);
    const handle = screen.getByLabelText('operations.table.resizeSubmitter');

    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    expect(testState.resizeStarted).toHaveBeenCalledWith('submitter');
    fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
    expect(testState.columnResized).toHaveBeenLastCalledWith({ column: 'submitter', width: 180 + 60 });
    fireEvent.pointerUp(handle, { clientX: 160, pointerId: 1 });
    expect(testState.resizeEnded).toHaveBeenCalled();

    fireEvent.click(handle);
    expect(testState.sortToggled).not.toHaveBeenCalled();
  });

  it('a second pointerdown during a drag ends the first drag first', () => {
    render(<OperationsTableHeader />);
    const handle = screen.getByLabelText('operations.table.resizeSubmitter');

    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerDown(handle, { clientX: 120, pointerId: 2 });

    expect(testState.resizeStarted).toHaveBeenCalledTimes(2);
    expect(testState.resizeEnded).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(handle, { clientX: 120, pointerId: 2 });
    expect(testState.resizeEnded).toHaveBeenCalledTimes(2);
  });

  it('resizes from the keyboard', () => {
    render(<OperationsTableHeader />);
    const handle = screen.getByLabelText('operations.table.resizeSubmitter');

    expect(handle).toHaveAttribute('tabindex', '0');
    expect(handle).toHaveAttribute('aria-valuenow', '180');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(testState.columnResized).toHaveBeenLastCalledWith({ column: 'submitter', width: 188 });

    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(testState.columnResized).toHaveBeenLastCalledWith({ column: 'submitter', width: 148 });

    fireEvent.keyDown(handle, { key: 'Home' });
    expect(testState.columnResized).toHaveBeenLastCalledWith({ column: 'submitter', width: 140 });

    fireEvent.keyDown(handle, { key: 'End' });
    expect(testState.columnAutofit).toHaveBeenCalledWith('submitter');
  });

  it('double-click autofits the column', () => {
    render(<OperationsTableHeader />);
    fireEvent.doubleClick(screen.getByLabelText('operations.table.resizeValue'));
    expect(testState.columnAutofit).toHaveBeenCalledWith('value');
  });

  it('the actions column has its own resize handle', () => {
    render(<OperationsTableHeader />);
    fireEvent.doubleClick(screen.getByLabelText('operations.table.resizeActions'));
    expect(testState.columnAutofit).toHaveBeenCalledWith('actions');
  });

  it('the initiator caption is not sortable but has its own resize handle', () => {
    render(<OperationsTableHeader />);
    const caption = screen.getByText('operations.table.initiator');
    expect(caption.closest('button')).toBeNull();

    fireEvent.doubleClick(screen.getByLabelText('operations.table.resizeInitiator'));
    expect(testState.columnAutofit).toHaveBeenCalledWith('initiator');
  });
});
