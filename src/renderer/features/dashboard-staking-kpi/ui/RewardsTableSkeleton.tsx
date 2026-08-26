import { useMemo } from 'react';

import { type Column, Skeleton, Table } from '@/shared/ui-kit';

import { type RewardColumnKey, REWARD_COLUMNS } from './rewardColumnLayout';

const SKELETON_ROWS = 5;

/** Placeholder row — one field per column, so the table types line up. */
type SkeletonRow = Record<RewardColumnKey, null> & { id: string };

type Props = { titles: Record<RewardColumnKey, string> };

/**
 * The loaded table's own header and column widths, with the cells blanked.
 *
 * Reusing `Table` rather than drawing a stand-in grid is what removes the jump:
 * the row height, the paddings and the widths are literally the same code, so
 * there is nothing left to drift. The same trick the positions table uses.
 */
export const RewardsTableSkeleton = ({ titles }: Props) => {
  const rows = useMemo<SkeletonRow[]>(
    () =>
      Array.from({ length: SKELETON_ROWS }, (_, index) => ({
        id: `skeleton-${index}`,
        validatorId: null,
        nominators: null,
        accrued: null,
        unclaimed: null,
        payouts: null,
      })),
    [],
  );

  const columns = useMemo<Column<SkeletonRow>[]>(
    () =>
      REWARD_COLUMNS.map((column) => ({
        key: column.key,
        title: titles[column.key],
        width: column.width,
        render: () => <Skeleton width={column.placeholder} height="20px" />,
      })),
    [titles],
  );

  return <Table columns={columns} data={rows} getRowKey={(row) => row.id} stickyHeader truncateHeaders />;
};
