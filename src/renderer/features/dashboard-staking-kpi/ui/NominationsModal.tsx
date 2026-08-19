import { memo, useCallback, useMemo, useState } from 'react';

import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { buildCsv, downloadCsv } from '@/shared/lib/csv';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, HelpText, SmallTitleText } from '@/shared/ui';
import { ALLOCATION_COLORS, getColorByIndex } from '@/shared/ui/chart-constants';
import { type Column, type LabelVariant, EmptyMessage, Label, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { type NominationStatus, type StakingPosition } from '@/domains/staking';
import { NamedAccount } from '@/widgets/NameResolver';
import { useNominationSpread } from '../hooks/useNominationSpread';
import { useStakingChainAssets } from '../hooks/useStakingChainAssets';
import { formatAssetAmountExact } from '../lib/amounts';
import { type CsvSpreadRow, csvFileName, spreadCsvColumns } from '../lib/csv';
import { formatFiat } from '../lib/format-fiat';
import { type SpreadRow, buildDistribution, countSpread } from '../lib/spread';

import { DonutBreakdown } from './DonutBreakdown';

type Props = {
  /** The positions the selection holds — every nomination is read off them. */
  positions: StakingPosition[];
  chains: Record<ChainId, Chain>;
  currency: CurrencyItem | null;
  walletByAccount: Record<string, Wallet | null>;
  onClose: () => void;
};

const STATUS_VARIANT: Record<NominationStatus, LabelVariant> = {
  active: 'green',
  waiting: 'orange',
  droppedOut: 'red',
};

const STATUS_FILTERS = ['all', 'active', 'droppedOut', 'waiting'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

/** Bonded stake standing behind nobody — a slice, but never a validator. */
const IDLE_KEY = 'idle';
const IDLE_COLOR = ALLOCATION_COLORS.locked;

type DisplayRow = SpreadRow & {
  /** First row of its account — only there is the nominator spelled out. */
  firstOfAccount: boolean;
};

/**
 * Where the selection's stake actually went.
 *
 * Nominating and being backed are different facts, and the gap between them is
 * the point of this view: the donut sizes each validator by the stake the era
 * put behind it, while the table names every nomination underneath, including
 * the ones that earn nothing. The donut is deliberately unaffected by the table
 * filter — it is the whole picture the filtered list is a slice of.
 */
export const NominationsModal = memo(({ positions, chains, currency, walletByAccount, onClose }: Props) => {
  const { t } = useI18n();
  const { toFiat } = useStakingChainAssets();
  const rows = useNominationSpread(positions);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const counts = useMemo(() => countSpread(rows), [rows]);
  const distribution = useMemo(() => buildDistribution({ rows, positions, toFiat }), [rows, positions, toFiat]);

  // Positional colour: the rows arrive largest-first, so the biggest slice
  // always takes the first colour of the palette.
  const colorByValidator = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [index, slice] of distribution.slices.entries()) {
      result[slice.key] = getColorByIndex(index);
    }

    return result;
  }, [distribution]);

  const donutData = useMemo(() => {
    const slices = distribution.slices
      .filter((slice) => Number(slice.fiat) > 0)
      .map((slice) => ({ id: slice.key, value: Number(slice.fiat), color: colorByValidator[slice.key] ?? IDLE_COLOR }));

    if (Number(distribution.idleFiat) > 0) {
      slices.push({ id: IDLE_KEY, value: Number(distribution.idleFiat), color: IDLE_COLOR });
    }

    return slices;
  }, [distribution, colorByValidator]);

  const hoveredSlice = hoveredId === null ? null : (distribution.slices.find((s) => s.key === hoveredId) ?? null);

  const visibleRows = useMemo<DisplayRow[]>(() => {
    const filtered = filter === 'all' ? rows : rows.filter((row) => row.status === filter);
    let previousAccount: string | null = null;

    return filtered.map((row) => {
      const accountKey = `${row.chainId}:${row.accountId}`;
      const firstOfAccount = accountKey !== previousAccount;
      previousAccount = accountKey;

      return { ...row, firstOfAccount };
    });
  }, [rows, filter]);

  const handleExport = useCallback(() => {
    const csvRows: CsvSpreadRow[] = rows.map((row) => ({
      ...row,
      address: toAddress(row.accountId, { prefix: chains[row.chainId]?.addressPrefix }),
      accountName: walletByAccount[row.accountId]?.name ?? '',
      validatorAddress: toAddress(row.validatorId, { prefix: chains[row.chainId]?.addressPrefix }),
      statusLabel: t(`dashboard.staking.kpi.nominations.status.${row.status}`),
    }));

    const columns = spreadCsvColumns({
      account: t('dashboard.staking.kpi.columns.account'),
      address: t('dashboard.staking.kpi.columns.address'),
      network: t('dashboard.staking.kpi.columns.network'),
      asset: t('dashboard.staking.kpi.columns.asset'),
      validator: t('dashboard.staking.kpi.columns.validator'),
      status: t('dashboard.staking.kpi.columns.status'),
      allocated: t('dashboard.staking.kpi.columns.allocated'),
      staked: t('dashboard.staking.kpi.columns.staked'),
    });

    downloadCsv(csvFileName('nomination-spread'), buildCsv(columns, csvRows));
  }, [rows, chains, walletByAccount, t]);

  const columns = useMemo<Column<DisplayRow>[]>(
    () => [
      {
        key: 'accountId',
        title: t('dashboard.staking.kpi.nominations.nominatorColumn'),
        width: '30%',
        render: (_, item) =>
          item.firstOfAccount ? (
            <div className="min-w-0">
              <NamedAccount
                accountId={item.accountId}
                chain={chains[item.chainId]}
                wallet={walletByAccount[item.accountId]}
                titleClass="truncate font-semibold"
                variant="short"
                iconSize={24}
                hideExplorers
              />
              <HelpText className="text-text-tertiary">{item.chainName}</HelpText>
            </div>
          ) : null,
      },
      {
        key: 'validatorId',
        title: t('dashboard.staking.kpi.nominations.validatorColumn'),
        width: '32%',
        render: (_, item) => {
          const sliceKey = `${item.chainId}:${item.validatorId}`;
          const color = colorByValidator[sliceKey];

          return (
            <div
              className="flex min-w-0 items-center gap-x-2"
              // Only a validator that owns a slice may highlight one; hovering a
              // nomination that holds nothing would dim the whole donut for no
              // reason.
              onMouseEnter={() => setHoveredId(color ? sliceKey : null)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full transition-opacity"
                style={{
                  backgroundColor: color ?? 'transparent',
                  opacity: hoveredId !== null && hoveredId !== sliceKey ? 0.3 : 1,
                }}
              />
              <NamedAccount
                accountId={item.validatorId}
                chain={chains[item.chainId]}
                titleClass="truncate"
                variant="short"
                iconSize={20}
                hideExplorers
              />
            </div>
          );
        },
      },
      {
        key: 'status',
        title: t('dashboard.staking.kpi.nominations.statusColumn'),
        width: '18%',
        render: (_, item) => (
          <Label variant={STATUS_VARIANT[item.status]}>
            {t(`dashboard.staking.kpi.nominations.status.${item.status}`)}
          </Label>
        ),
      },
      {
        key: 'allocated',
        // `Table` has no per-column alignment, so the header carries its own —
        // right-aligned amounts only read as a column when the title is too.
        title: <span className="block text-end">{t('dashboard.staking.kpi.columns.allocated')}</span>,
        width: '20%',
        render: (_, item) => (
          <div className="text-end">
            {item.allocated === null ? (
              <FootnoteText className="text-text-tertiary">
                {t('dashboard.staking.kpi.nominations.unknown')}
              </FootnoteText>
            ) : (
              <FootnoteText
                className={cnTw('tabular-nums', item.status === 'active' ? 'font-semibold' : 'text-text-tertiary')}
              >
                {formatAssetAmountExact({ symbol: item.symbol, precision: item.precision, amount: item.allocated })}
              </FootnoteText>
            )}
          </div>
        ),
      },
    ],
    [t, chains, walletByAccount, colorByValidator, hoveredId],
  );

  return (
    <Modal isOpen size="xl" height="lg" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('dashboard.staking.kpi.nominations.detailTitle')}</Modal.Title>
      <Modal.Content disableScroll>
        {rows.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyMessage
              title={t('dashboard.staking.kpi.nominations.emptyTitle')}
              description={t('dashboard.staking.kpi.nominations.empty')}
            />
          </div>
        ) : (
          <div className="flex h-full min-h-0 gap-6 px-5 pt-2 pb-4">
            {/* Nothing elected and nothing bonded idle: a chart of zero would
                claim more than it knows, so the table stands alone. */}
            <div
              className={cnTw('w-52 shrink-0 flex-col items-center gap-2', donutData.length === 0 ? 'hidden' : 'flex')}
            >
              <DonutBreakdown data={donutData} hoveredId={hoveredId} onHover={setHoveredId}>
                {hoveredSlice ? (
                  <>
                    <FootnoteText className="font-bold">{formatFiat(hoveredSlice.fiat, currency)}</FootnoteText>
                    <HelpText className="text-text-tertiary">
                      {t('dashboard.staking.kpi.nominations.nominatorsValue', { count: hoveredSlice.accountCount })}
                    </HelpText>
                  </>
                ) : hoveredId === IDLE_KEY ? (
                  <>
                    <FootnoteText className="font-bold">{formatFiat(distribution.idleFiat, currency)}</FootnoteText>
                    <HelpText className="text-text-tertiary">{t('dashboard.staking.kpi.nominations.idle')}</HelpText>
                  </>
                ) : (
                  <>
                    <SmallTitleText>{formatFiat(distribution.totalFiat, currency)}</SmallTitleText>
                    <HelpText className="text-text-tertiary">
                      {t('dashboard.staking.kpi.nominations.allocatedTotal')}
                    </HelpText>
                  </>
                )}
              </DonutBreakdown>

              <HelpText className="text-center text-text-tertiary">
                {t('dashboard.staking.kpi.nominations.donutCaption')}
              </HelpText>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex w-fit shrink-0 items-center gap-x-1 rounded-md bg-tab-background p-0.5">
                {STATUS_FILTERS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cnTw(
                      'cursor-pointer rounded-sm px-3 py-1 text-button-small transition-all duration-100',
                      filter === option
                        ? 'bg-white text-text-primary shadow-card-shadow'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                    onClick={() => setFilter(option)}
                  >
                    {t(`dashboard.staking.kpi.nominations.filter.${option}`, {
                      count: option === 'all' ? counts.total : counts[option],
                    })}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <Table columns={columns} data={visibleRows} getRowKey={(item) => item.key} stickyHeader />
              </div>
            </div>
          </div>
        )}
      </Modal.Content>

      {rows.length > 0 && (
        <Modal.Footer align="between">
          <FootnoteText className="text-text-tertiary">
            {t('dashboard.staking.kpi.nominations.footerCounts', {
              total: counts.total,
              accounts: counts.accounts,
              active: counts.active,
              dropped: counts.droppedOut,
              waiting: counts.waiting,
            })}
          </FootnoteText>
          <Button variant="text" size="sm" onClick={handleExport}>
            {t('dashboard.staking.kpi.exportCsv')}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
});
