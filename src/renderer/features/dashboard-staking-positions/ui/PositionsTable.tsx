import { type ReactNode, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { CaptionText, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { type Column, type TableSort, Table } from '@/shared/ui-kit';
import { AssetFiatBalance } from '@/widgets/price';
import { type PositionRow } from '../lib';

import { PositionAccountCell } from './PositionAccountCell';
import { PositionStatusPill } from './PositionStatusPill';
import { UnclaimedCell } from './UnclaimedCell';
import { type PositionColumnKey, POSITION_COLUMNS } from './columnLayout';

/**
 * Past this many rows the card would grow taller than the dashboard grid, so
 * the body becomes the scroll container instead of the page.
 */
export const SCROLL_THRESHOLD = 20;
/**
 * Eight rows plus the header — enough to compare without hiding the widgets
 * below.
 */
const SCROLL_MAX_HEIGHT = 448;

type Props = {
  rows: PositionRow[];
  sort: TableSort;
  onSortChange: (sort: TableSort | null) => void;
  onRowClick: (row: PositionRow) => void;
};

export const PositionsTable = ({ rows, sort, onSortChange, onRowClick }: Props) => {
  const { t } = useI18n();

  const columns = useMemo<Column<PositionRow>[]>(() => {
    const renderers: Record<PositionColumnKey, (row: PositionRow) => ReactNode> = {
      accountId: (row) => <PositionAccountCell row={row} />,

      staked: (row) => (
        <div className="flex flex-col">
          <AssetBalance value={row.staked} asset={row.asset} className="text-footnote" />
          <AssetFiatBalance asset={row.asset} amount={row.staked} />
        </div>
      ),

      sharePercent: (row) => (
        <FootnoteText className="text-text-secondary">
          {t('assetBalance.number', { value: row.sharePercent.toFixed(1), maximumFractionDigits: 1 })}%
        </FootnoteText>
      ),

      status: (row) => (
        <PositionStatusPill
          status={row.position.status}
          statusReason={row.position.statusReason}
          kind={row.position.kind}
        />
      ),

      apy: (row) =>
        row.apy === null ? (
          <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
        ) : (
          // The column header already says APY — a bare percent keeps the cell
          // on one line (same format as the nominations table).
          <FootnoteText className="text-text-positive">{`${row.apy.toFixed(1)}%`}</FootnoteText>
        ),

      activeValidatorCount: (row) => (
        <FootnoteText className="text-text-secondary">
          {row.position.kind === 'validator'
            ? row.position.validator?.nominatorCount == null
              ? t('dashboard.staking.positions.noValue')
              : t('dashboard.staking.positions.nominatorsValue', { count: row.position.validator.nominatorCount })
            : t('dashboard.staking.positions.validatorsValue', {
                active: row.activeValidatorCount,
                total: row.nominationCount,
              })}
        </FootnoteText>
      ),

      asset: (row) => <UnclaimedCell row={row} />,

      accessMode: (row) => (
        <div className="flex items-center justify-end gap-x-1.5">
          {row.accessMode === 'draft' ? <Icon name="edit" size={14} className="text-text-tertiary" /> : null}
          {row.accessMode === 'watchOnly' ? (
            <CaptionText className="text-text-tertiary">{t('dashboard.staking.positions.viewOnly')}</CaptionText>
          ) : null}
          <Icon name="right" size={14} className="text-text-tertiary" />
        </div>
      ),
    };

    return POSITION_COLUMNS.map((column) => ({
      key: column.key,
      title: column.titleKey ? t(`dashboard.staking.positions.${column.titleKey}`) : '',
      sortable: column.sortable,
      width: column.width,
      render: (_value, row) => renderers[column.key](row),
    }));
  }, [t]);

  const scrolls = rows.length > SCROLL_THRESHOLD;

  return (
    <div
      className={scrolls ? 'overflow-y-auto' : undefined}
      style={scrolls ? { maxHeight: SCROLL_MAX_HEIGHT } : undefined}
    >
      <Table
        columns={columns}
        data={rows}
        sort={sort}
        stickyHeader={scrolls}
        getRowKey={(row) => row.id}
        onSortChange={onSortChange}
        onRowClick={onRowClick}
      />
    </div>
  );
};
