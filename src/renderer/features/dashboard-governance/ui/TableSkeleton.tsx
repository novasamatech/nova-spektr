import { memo } from 'react';

import { Skeleton } from '@/shared/ui-kit';

type Props = {
  /**
   * How many rows the table is expected to show, so the card does not jump when
   * they arrive.
   */
  rows?: number;
  /**
   * Widths of the trailing column placeholders, after the leading avatar + name
   * pair.
   */
  columns?: string[];
};

const DEFAULT_COLUMNS = ['100px', '80px', '80px', '120px'];

/**
 * A loading body shaped like the table it stands in for — an avatar and two
 * lines of text per row, then one plate per column — so the swap to real rows
 * is a fill-in rather than a jump from three thin lines to a full table.
 */
export const TableSkeleton = memo(({ rows = 3, columns = DEFAULT_COLUMNS }: Props) => (
  <div className="mt-3 flex flex-col" data-testid="table-skeleton">
    {Array.from({ length: rows }, (_, index) => (
      // Placeholders have no identity of their own; the index is the only key there is.
      // eslint-disable-next-line react/no-array-index-key
      <div key={index} className="flex h-[70px] items-center gap-6 px-3">
        <div className="flex w-[180px] items-center gap-2">
          <Skeleton circle width="32px" height="32px" />
          <div className="flex flex-col gap-1.5">
            <Skeleton width="110px" height="12px" />
            <Skeleton width="70px" height="10px" />
          </div>
        </div>
        {columns.map((width, column) => (
          <Skeleton key={column} width={width} height="12px" />
        ))}
      </div>
    ))}
  </div>
));
