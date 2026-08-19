import { useMemo, useState } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { type Column, type LabelVariant, type TableSort, Label, Table } from '@/shared/ui-kit';
import { NamedAccount } from '@/widgets/NameResolver';
import {
  type NominationCounts,
  type NominationRow,
  type NominationStatus,
  DEFAULT_NOMINATION_SORT,
  isNominationSortColumn,
  sortNominationRows,
} from '../lib';

type Props = {
  rows: NominationRow[];
  counts: NominationCounts;
  chain: Chain;
  asset: Asset;
};

const STATUS_VARIANT: Record<NominationStatus, LabelVariant> = {
  active: 'green',
  waiting: 'orange',
  droppedOut: 'red',
};

/**
 * Six columns, four of them carrying a sort arrow, plus an explorers button on
 * the account. Measured against the drawer's own width: every header stays on
 * one line, the longest status pill (`dropped out`) and the widest realistic
 * amount both fit unbroken, and the validator keeps enough room not to truncate
 * an address that has no identity behind it. Squeezing this into the 560px the
 * drawer used to be is what clipped the headers — the drawer was widened
 * instead of shaving another column.
 */
const COLUMN_WIDTH = {
  validator: '34%',
  status: '15.5%',
  ourStake: '18.5%',
  commission: '10%',
  apy: '10%',
  eraPoints: '12%',
} as const;

/**
 * The sort is controlled rather than left to `Table`'s own: the columns the
 * user wants to order by are the ones its generic comparator gets wrong.
 * `status` is three words whose alphabet says nothing about severity,
 * `ourStake` is planck far past `Number.MAX_SAFE_INTEGER`, and `apy` /
 * `eraPoints` carry a `null` that must sink rather than sort as zero.
 */
export const NominationsTable = ({ rows, counts, chain, asset }: Props) => {
  const { t } = useI18n();
  const [sort, setSort] = useState<TableSort | null>(DEFAULT_NOMINATION_SORT);

  const sortedRows = useMemo(() => {
    if (sort === null || !isNominationSortColumn(sort.column)) return rows;

    return sortNominationRows(rows, sort.column, sort.direction);
  }, [rows, sort]);

  const columns = useMemo<Column<NominationRow>[]>(
    () => [
      {
        key: 'accountId',
        title: t('dashboard.staking.positions.detail.nominations.validator'),
        width: COLUMN_WIDTH.validator,
        // Explorers on, as everywhere else an account is shown: the address and
        // the block explorer links are the only way out of this table into the
        // chain, and a validator is exactly the account a user wants to look up.
        render: (_value, row) => <NamedAccount accountId={row.accountId} chain={chain} variant="short" iconSize={20} />,
      },
      {
        key: 'status',
        title: t('dashboard.staking.positions.detail.nominations.status'),
        width: COLUMN_WIDTH.status,
        sortable: true,
        render: (_value, row) => (
          <Label variant={STATUS_VARIANT[row.status]}>
            {t(`dashboard.staking.positions.detail.nominations.${row.status}`)}
          </Label>
        ),
      },
      {
        key: 'ourStake',
        title: t('dashboard.staking.positions.detail.nominations.ourStake'),
        width: COLUMN_WIDTH.ourStake,
        sortable: true,
        render: (_value, row) =>
          row.ourStake === null ? (
            <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
          ) : (
            <AssetBalance value={row.ourStake} asset={asset} className="text-footnote" />
          ),
      },
      {
        key: 'commission',
        title: t('dashboard.staking.positions.detail.nominations.commission'),
        width: COLUMN_WIDTH.commission,
        render: (_value, row) => (
          <FootnoteText className="text-text-secondary">
            {row.commission === null ? t('dashboard.staking.positions.noValue') : `${row.commission.toFixed(1)}%`}
          </FootnoteText>
        ),
      },
      {
        key: 'apy',
        title: t('dashboard.staking.positions.detail.nominations.apy'),
        width: COLUMN_WIDTH.apy,
        sortable: true,
        render: (_value, row) =>
          row.apy === null ? (
            <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
          ) : (
            <FootnoteText className="text-text-positive">{`${row.apy.toFixed(1)}%`}</FootnoteText>
          ),
      },
      {
        key: 'eraPoints',
        title: t('dashboard.staking.positions.detail.nominations.eraPoints'),
        width: COLUMN_WIDTH.eraPoints,
        sortable: true,
        render: (_value, row) => (
          <FootnoteText className="text-text-secondary">
            {row.eraPoints === null ? t('dashboard.staking.positions.noValue') : row.eraPoints}
          </FootnoteText>
        ),
      },
    ],
    [t, chain, asset],
  );

  if (rows.length === 0) {
    return (
      <FootnoteText className="px-5 py-4 text-text-tertiary">
        {t('dashboard.staking.positions.detail.nominations.empty')}
      </FootnoteText>
    );
  }

  return (
    // Pulled out by one cell padding: the cells' *content* then sits on the
    // drawer's own 20px gutter instead of the table's box, so the table gains
    // 24px of width without breaking the panel's vertical rhythm.
    <div className="-mx-3 flex flex-col">
      <Table
        columns={columns}
        data={sortedRows}
        sort={sort}
        getRowKey={(row) => row.accountId}
        onSortChange={setSort}
      />

      <CaptionText className="px-3 py-3 text-text-tertiary">
        {t('dashboard.staking.positions.detail.nominations.footer', {
          total: counts.total,
          active: counts.active,
          waiting: counts.waiting,
          dropped: counts.droppedOut,
        })}
      </CaptionText>
    </div>
  );
};
