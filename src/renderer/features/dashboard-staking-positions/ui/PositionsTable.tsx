import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { CaptionText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { type DataTableColumn, type DataTableFilterState, DataTable } from '@/shared/ui-kit';
import { AssetFiatBalance } from '@/widgets/price';
import { type PositionRow, DEFAULT_SORT, comparePlanck } from '../lib';

import { PositionAccountCell } from './PositionAccountCell';
import { PositionStatusPill } from './PositionStatusPill';
import { UnclaimedCell } from './UnclaimedCell';
import { type PositionColumnId, POSITIONS_MIN_WIDTH, POSITION_COLUMNS } from './columnLayout';

/**
 * Past this many rows the card would grow taller than the dashboard grid, so
 * the body becomes the scroll container instead of the page.
 */
export const SCROLL_THRESHOLD = 20;

/** Everything a column contributes beyond its identity, width and header. */
type ColumnBody = Omit<DataTableColumn<PositionRow>, 'id' | 'title' | 'width'>;

type Props = {
  rows: PositionRow[];
  onRowClick: (row: PositionRow) => void;
};

const exportName = (context: { filters: DataTableFilterState }, isoDate: string): string => {
  const parts = [...(context.filters.enum['network'] ?? []), ...(context.filters.enum['role'] ?? [])].map((part) =>
    part.toLowerCase().replaceAll(/\s+/g, '-'),
  );

  return `nova-spektr-staking-positions-${[...parts, isoDate].join('-')}.csv`;
};

export const PositionsTable = ({ rows, onRowClick }: Props) => {
  const { t } = useI18n();

  const columns = useMemo<DataTableColumn<PositionRow>[]>(() => {
    const noValue = t('dashboard.staking.positions.noValue');

    /**
     * A planck column: rendered as a token amount, filtered by a numeric range,
     * and sorted as a big integer — the amounts run well past
     * `Number.MAX_SAFE_INTEGER`, so `value` alone would mis-order large bonds.
     */
    const planck = (pick: (row: PositionRow) => string | null): ColumnBody => ({
      sortable: true,
      filter: 'range',
      text: (row) => {
        const value = pick(row);
        if (value === null) return noValue;

        const formatted = formatBalance(value, row.asset.precision);

        return `${formatted.formatted}${formatted.suffix} ${row.asset.symbol}`;
      },
      exportValue: (row) => {
        const value = pick(row);

        return value === null ? '' : formatBalance(value, row.asset.precision, { keepPrecision: true }).formatted;
      },
      value: (row) => {
        const value = pick(row);

        return value === null ? null : Number(formatBalance(value, row.asset.precision, { keepPrecision: true }).value);
      },
      compare: (a, b) => {
        const left = pick(a);
        const right = pick(b);

        // Unknown sinks in both directions: it says "not read", not "small".
        if (left === null && right === null) return 0;
        if (left === null) return 1;
        if (right === null) return -1;

        return comparePlanck(left, right);
      },
      render: (row) => {
        const value = pick(row);

        return value === null ? (
          <FootnoteText className="text-text-tertiary">{noValue}</FootnoteText>
        ) : (
          <AssetBalance value={value} asset={row.asset} className="text-footnote" />
        );
      },
    });

    const bodies: Record<PositionColumnId, ColumnBody> = {
      network: {
        sortable: true,
        filter: 'enum',
        text: (row) => row.networkName,
        render: (row) => <FootnoteText className="truncate">{row.networkName}</FootnoteText>,
      },

      chain: {
        sortable: true,
        filter: 'enum',
        text: (row) => row.chain.name,
        render: (row) => <FootnoteText className="truncate text-text-secondary">{row.chain.name}</FootnoteText>,
      },

      // No filter on the account: the name this cell prints is resolved inside
      // it (custom name → contact → on-chain identity → wallet), so a filter
      // here could only match a raw field the user is not looking at. The
      // Address column beside it is the searchable identity.
      account: { render: (row) => <PositionAccountCell row={row} /> },

      address: {
        filter: 'text',
        text: (row) => row.address,
        render: (row) => <HelpText className="truncate text-text-tertiary">{row.address}</HelpText>,
      },

      role: {
        sortable: true,
        filter: 'enum',
        text: (row) => t(`dashboard.staking.positions.role.${row.role}`),
        render: (row) => (
          <FootnoteText className="text-text-secondary">
            {t(`dashboard.staking.positions.role.${row.role}`)}
          </FootnoteText>
        ),
      },

      totalBalance: planck((row) => row.totalBalance),
      nominatingStake: planck((row) => row.nominatingStake),
      selfStake: planck((row) => row.selfStake),

      staked: {
        ...planck((row) => row.staked),
        render: (row) => (
          <div className="flex flex-col">
            <AssetBalance value={row.staked} asset={row.asset} className="text-footnote" />
            <AssetFiatBalance asset={row.asset} amount={row.staked} />
          </div>
        ),
      },

      sharePercent: {
        sortable: true,
        filter: 'range',
        text: (row) => `${row.sharePercent.toFixed(1)}%`,
        value: (row) => row.sharePercent,
        render: (row) => (
          <FootnoteText className="text-text-secondary">
            {t('assetBalance.number', { value: row.sharePercent.toFixed(1), maximumFractionDigits: 1 })}%
          </FootnoteText>
        ),
      },

      status: {
        sortable: true,
        filter: 'enum',
        text: (row) => t(`dashboard.staking.positions.status.${row.status}`),
        render: (row) => (
          <PositionStatusPill
            status={row.position.status}
            statusReason={row.position.statusReason}
            kind={row.position.kind}
          />
        ),
      },

      apy: {
        sortable: true,
        filter: 'range',
        text: (row) => (row.apy === null ? noValue : `${row.apy.toFixed(1)}%`),
        value: (row) => row.apy,
        render: (row) =>
          row.apy === null ? (
            <FootnoteText className="text-text-tertiary">{noValue}</FootnoteText>
          ) : (
            // The column header already says APY — a bare percent keeps the
            // cell on one line (same format as the nominations table).
            <FootnoteText className="text-text-positive">{`${row.apy.toFixed(1)}%`}</FootnoteText>
          ),
      },

      // A validating stash has nominators rather than nominations, so the
      // column reads the other side of the relation for it. Sorting and the
      // range filter stay on the nominator count either way: both are "how
      // many validators/nominators does this row involve".
      activeValidatorCount: {
        sortable: true,
        filter: 'range',
        text: (row) =>
          row.position.kind === 'validator'
            ? (row.position.validator?.nominatorCount?.toString() ?? noValue)
            : `${row.activeValidatorCount}/${row.nominationCount}`,
        value: (row) =>
          row.position.kind === 'validator'
            ? (row.position.validator?.nominatorCount ?? null)
            : row.activeValidatorCount,
        render: (row) => (
          <FootnoteText className="text-text-secondary">
            {row.position.kind === 'validator'
              ? row.position.validator?.nominatorCount == null
                ? noValue
                : t('dashboard.staking.positions.nominatorsValue', { count: row.position.validator.nominatorCount })
              : t('dashboard.staking.positions.validatorsValue', {
                  active: row.activeValidatorCount,
                  total: row.nominationCount,
                })}
          </FootnoteText>
        ),
      },

      // The amount is resolved by a per-row hook inside the cell, so it is not
      // in the row and cannot be sorted, filtered or exported from here.
      unclaimed: { decorative: true, render: (row) => <UnclaimedCell row={row} /> },

      accessMode: {
        decorative: true,
        render: (row) => (
          <div className="flex items-center justify-end gap-x-1.5">
            {row.accessMode === 'draft' ? <Icon name="edit" size={14} className="text-text-tertiary" /> : null}
            {row.accessMode === 'watchOnly' ? (
              <CaptionText className="text-text-tertiary">{t('dashboard.staking.positions.viewOnly')}</CaptionText>
            ) : null}
            <Icon name="right" size={14} className="text-text-tertiary" />
          </div>
        ),
      },
    };

    return POSITION_COLUMNS.map((column) => ({
      id: column.id,
      title: column.titleKey ? t(`dashboard.staking.positions.${column.titleKey}`) : '',
      width: column.width,
      ...bodies[column.id],
    }));
  }, [t]);

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      defaultSort={DEFAULT_SORT}
      minWidth={POSITIONS_MIN_WIDTH}
      scrollThreshold={SCROLL_THRESHOLD}
      searchPlaceholder={t('dashboard.staking.positions.searchPlaceholder')}
      exportFileName={(context) => exportName(context, new Date().toISOString().slice(0, 10))}
      onRowClick={onRowClick}
    />
  );
};
