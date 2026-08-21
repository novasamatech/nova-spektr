import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COLUMN_DEFAULT_WIDTHS } from '@/aggregates/operations-table-layout';

import { OperationsTableHeader } from './OperationsTableHeader';

if (typeof window.PointerEvent === 'undefined') {
  // jsdom has no PointerEvent; MouseEvent carries clientX which is all the handle reads.
  Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, configurable: true });
}

/** The stubbed `t` joins the key and the interpolated caption. */
const resizeLabel = (captionKey: string) => `operations.table.resizeColumn:operations.table.${captionKey}`;

const ALL_VISIBLE = {
  value: true,
  submitter: true,
  initiator: true,
  description: true,
  status: true,
  actions: true,
};

const testState = vi.hoisted(() => ({
  tab: 'pending' as string,
  isScopeMerged: false,
  hasEverConnected: true,
  visibility: {
    value: true,
    submitter: true,
    initiator: true,
    description: true,
    status: true,
    actions: true,
  } as Record<string, boolean>,
  columnVisibilityChanged: vi.fn(),
  layoutReset: vi.fn(),
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

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => (params?.column ? `${key}:${params.column}` : key),
  }),
}));

vi.mock('@/aggregates/backend', () => ({
  connectionHistoryModel: { $hasEverConnected: testState.stores.hasEverConnected },
}));

vi.mock('@/aggregates/operations-table-layout', async importOriginal => ({
  ...(await importOriginal<object>()),
  operationsTableLayoutModel: {
    columnResized: testState.columnResized,
    columnAutofit: testState.columnAutofit,
    resizeStarted: testState.resizeStarted,
    resizeEnded: testState.resizeEnded,
    columnVisibilityChanged: testState.columnVisibilityChanged,
    layoutReset: testState.layoutReset,
  },
  useOperationColumnWidths: () => COLUMN_DEFAULT_WIDTHS,
  useOperationColumnVisibility: () => testState.visibility,
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
    testState.visibility = { ...ALL_VISIBLE };
    testState.columnVisibilityChanged.mockReset();
    testState.layoutReset.mockReset();
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
    const handle = screen.getByLabelText(resizeLabel('submitter'));

    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1, button: 0 });
    expect(testState.resizeStarted).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
    expect(testState.columnResized).toHaveBeenLastCalledWith({ column: 'submitter', width: 180 + 60 });
    fireEvent.pointerUp(handle, { clientX: 160, pointerId: 1 });
    expect(testState.resizeEnded).toHaveBeenCalled();

    fireEvent.click(handle);
    expect(testState.sortToggled).not.toHaveBeenCalled();
  });

  it('ignores a secondary-button press', () => {
    render(<OperationsTableHeader />);
    const handle = screen.getByLabelText(resizeLabel('submitter'));

    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1, button: 2 });
    expect(testState.resizeStarted).not.toHaveBeenCalled();
    fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
    expect(testState.columnResized).not.toHaveBeenCalled();
  });

  it('names the status handle after the caption it sits next to', () => {
    const { unmount } = render(<OperationsTableHeader />);
    expect(screen.getByLabelText(resizeLabel('signed'))).toBeInTheDocument();
    unmount();

    testState.tab = 'history';
    render(<OperationsTableHeader />);
    expect(screen.getByLabelText(resizeLabel('status'))).toBeInTheDocument();
    // The Actions caption is blank on the history tab; its handle still names the column.
    expect(screen.getByLabelText(resizeLabel('actions'))).toBeInTheDocument();
  });

  it('a second pointerdown during a drag ends the first drag first', () => {
    render(<OperationsTableHeader />);
    const handle = screen.getByLabelText(resizeLabel('submitter'));

    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1, button: 0 });
    fireEvent.pointerDown(handle, { clientX: 120, pointerId: 2, button: 0 });

    expect(testState.resizeStarted).toHaveBeenCalledTimes(2);
    expect(testState.resizeEnded).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(handle, { clientX: 120, pointerId: 2 });
    expect(testState.resizeEnded).toHaveBeenCalledTimes(2);
  });

  it('resizes from the keyboard', () => {
    render(<OperationsTableHeader />);
    const handle = screen.getByLabelText(resizeLabel('submitter'));

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
    fireEvent.doubleClick(screen.getByLabelText(resizeLabel('value')));
    expect(testState.columnAutofit).toHaveBeenCalledWith('value');
  });

  it('the actions column has its own resize handle', () => {
    render(<OperationsTableHeader />);
    fireEvent.doubleClick(screen.getByLabelText(resizeLabel('actions')));
    expect(testState.columnAutofit).toHaveBeenCalledWith('actions');
  });

  it('the initiator caption is not sortable but has its own resize handle', () => {
    render(<OperationsTableHeader />);
    const caption = screen.getByText('operations.table.initiator');
    expect(caption.closest('button')).toBeNull();

    fireEvent.doubleClick(screen.getByLabelText(resizeLabel('initiator')));
    expect(testState.columnAutofit).toHaveBeenCalledWith('initiator');
  });
});

describe('OperationsTableHeader column visibility', () => {
  beforeEach(() => {
    testState.visibility = { ...ALL_VISIBLE };
    testState.columnVisibilityChanged.mockReset();
    testState.layoutReset.mockReset();
  });

  it('drops the caption and the handle of a hidden column', () => {
    testState.visibility = { ...ALL_VISIBLE, submitter: false };
    render(<OperationsTableHeader />);

    expect(screen.queryByText('operations.table.submitter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(resizeLabel('submitter'))).not.toBeInTheDocument();
    expect(screen.getByText('operations.table.operation')).toBeInTheDocument();
  });

  it('toggles a column from the settings menu', async () => {
    const user = userEvent.setup();
    render(<OperationsTableHeader />);

    await user.click(screen.getByLabelText('operations.table.settings'));
    // The caption also reads "Description" — scope the click to the menu.
    const menu = await screen.findByTestId('Dropdown');
    await user.click(within(menu).getByText('operations.table.description'));

    expect(testState.columnVisibilityChanged).toHaveBeenCalledWith({ column: 'description', visible: false });
  });

  it('resets the layout from the settings menu', async () => {
    const user = userEvent.setup();
    render(<OperationsTableHeader />);

    await user.click(screen.getByLabelText('operations.table.settings'));
    await user.click(await screen.findByText('operations.table.resetDefaults'));

    expect(testState.layoutReset).toHaveBeenCalled();
    expect(testState.sortToggled).not.toHaveBeenCalled();
  });
});
