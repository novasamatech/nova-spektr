import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { type Column, Skeleton, Table } from '@/shared/ui-kit';

import { type PositionColumnKey, POSITION_COLUMNS } from './columnLayout';

const SKELETON_ROWS = 5;

/** Placeholder row — one field per column, so the table types line up. */
type SkeletonRow = Record<PositionColumnKey, null> & { id: string };

const PLACEHOLDER_WIDTH: Record<PositionColumnKey, string> = {
  accountId: '180px',
  staked: '80px',
  sharePercent: '36px',
  status: '56px',
  apy: '40px',
  activeValidatorCount: '52px',
  asset: '88px',
  accessMode: '16px',
};

/**
 * The loaded table's own header and column widths, with the cells blanked.
 *
 * Reusing `Table` rather than drawing a stand-in grid is what removes the jump:
 * the row height, the paddings and the widths are literally the same code, so
 * there is nothing left to drift.
 */
export const PositionsTableSkeleton = () => {
  const { t } = useI18n();

  const rows = useMemo<SkeletonRow[]>(
    () =>
      Array.from({ length: SKELETON_ROWS }, (_, index) => ({
        id: `skeleton-${index}`,
        accountId: null,
        staked: null,
        sharePercent: null,
        status: null,
        apy: null,
        activeValidatorCount: null,
        asset: null,
        accessMode: null,
      })),
    [],
  );

  const columns = useMemo<Column<SkeletonRow>[]>(
    () =>
      POSITION_COLUMNS.map((column) => ({
        key: column.key,
        title: column.titleKey ? t(`dashboard.staking.positions.${column.titleKey}`) : '',
        width: column.width,
        render: () => <Skeleton width={PLACEHOLDER_WIDTH[column.key]} height="20px" />,
      })),
    [t],
  );

  // Same stickiness as the loaded table — the header must not gain a divider
  // and start pinning only when the data lands.
  return <Table columns={columns} data={rows} getRowKey={(row) => row.id} stickyHeader />;
};
