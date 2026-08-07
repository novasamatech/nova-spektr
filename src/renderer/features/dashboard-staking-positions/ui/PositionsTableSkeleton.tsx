import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { type DataTableColumn, DataTable, Skeleton } from '@/shared/ui-kit';

import { POSITIONS_MIN_WIDTH, POSITION_COLUMNS } from './columnLayout';

const SKELETON_ROWS = 5;

type SkeletonRow = { id: string };

/**
 * The loaded table's own header and column widths, with the cells blanked.
 *
 * Reusing `DataTable` rather than drawing a stand-in grid is what removes the
 * jump: the row height, the paddings and the widths are literally the same
 * code, so there is nothing left to drift. Its toolbar stays off — there is
 * nothing to search or export yet.
 */
export const PositionsTableSkeleton = () => {
  const { t } = useI18n();

  const rows = useMemo<SkeletonRow[]>(
    () => Array.from({ length: SKELETON_ROWS }, (_, index) => ({ id: `skeleton-${index}` })),
    [],
  );

  const columns = useMemo<DataTableColumn<SkeletonRow>[]>(
    () =>
      POSITION_COLUMNS.map((column) => ({
        id: column.id,
        title: column.titleKey ? t(`dashboard.staking.positions.${column.titleKey}`) : '',
        width: column.width,
        decorative: true,
        render: () => <Skeleton width={column.placeholder} height="20px" />,
      })),
    [t],
  );

  // Same minimum width as the loaded table — the columns must not reflow the
  // moment the data lands.
  return <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} minWidth={POSITIONS_MIN_WIDTH} />;
};
