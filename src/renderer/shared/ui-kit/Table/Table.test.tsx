import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';

import { ScrollArea } from '../ScrollArea/ScrollArea';

import { type Column, Table } from './Table';

type Row = { id: string; name: string };

const columns: Column<Row>[] = [{ key: 'name', title: 'Name' }];

const rows: Row[] = Array.from({ length: 100 }, (_, index) => ({ id: `row-${index}`, name: `Row ${index}` }));

const ROW_HEIGHT = 40;
const VIEWPORT_HEIGHT = 200;

/**
 * Mirrors how `ValidatorTable` wires the table: the scroll element is the
 * `ScrollArea` viewport, an ancestor of the table, reached through a ref.
 */
const VirtualizedTable = ({ data }: { data: Row[] }) => {
  const viewportRef = useRef<HTMLDivElement>(null);

  return (
    <ScrollArea viewportRef={viewportRef}>
      <Table
        columns={columns}
        data={data}
        getRowKey={row => row.id}
        virtualization={{ getScrollElement: () => viewportRef.current, rowHeight: ROW_HEIGHT }}
      />
    </ScrollArea>
  );
};

describe('Table virtualization', () => {
  beforeEach(() => {
    // happy-dom has no layout; give the viewport a size (the virtualizer reads
    // `offsetHeight`) so there is something to fit rows into.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('scrollArea') ? VIEWPORT_HEIGHT : 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders rows when the data is already there on first mount', async () => {
    await act(async () => {
      render(<VirtualizedTable data={rows} />);
    });

    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.queryByText('Row 99')).not.toBeInTheDocument();
  });

  test('renders rows once the data arrives after mount', async () => {
    const { rerender } = render(<VirtualizedTable data={[]} />);

    await act(async () => {
      rerender(<VirtualizedTable data={rows} />);
    });

    expect(screen.getByText('Row 0')).toBeInTheDocument();
  });
});
