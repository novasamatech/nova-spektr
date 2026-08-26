import { memo, useCallback, useMemo, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { buildCsv, downloadCsv } from '@/shared/lib/csv';
import { formatAsset } from '@/shared/lib/utils';
import { Button, FootnoteText, HelpText, SmallTitleText } from '@/shared/ui';
import {
  type Column,
  type SegmentedOption,
  Label,
  Modal,
  SegmentedControl,
  Skeleton,
  Table,
  Tooltip,
} from '@/shared/ui-kit';
import { csvFileName } from '@/features/dashboard-staking-kpi';
import { useHistoryDepth } from '../hooks/useHistoryDepth';
import { type MinStakeRow, useMinStakeRows } from '../hooks/useMinStakeRows';
import { type ThresholdAsset } from '../hooks/useThresholdAssets';
import { CHART_HEIGHT, CSV_DATE_FORMAT, ERA_DATE_FORMAT } from '../lib/constants';
import { type CsvMinStakeRow, minStakeCsvColumns } from '../lib/csv';
import {
  formatAxisValue,
  formatEraNumber,
  formatExactTokens,
  formatSignedPercent,
  formatSignedTokens,
} from '../lib/format';
import { type EraRangePreset, DEFAULT_ERA_RANGE, ERA_RANGE_PRESETS, resolveEraDepth } from '../lib/range';
import { buildWindow } from '../lib/scale';

import { MinStakeChartArea } from './MinStakeChartArea';

type Props = {
  assets: ThresholdAsset[];
  selected: ThresholdAsset;
  showFiat: boolean;
  onChainChange: (chainId: ChainId) => void;
  onClose: () => void;
};

type TableRow = {
  key: number;
  era: string;
  date: string;
  minStake: string;
  change: string;
  validators: string;
  isActive: boolean;
};

/**
 * The drill-down: the full step line over a chosen range of eras, the same eras
 * as a table, and the file. The card abbreviates (`1.15M DOT`); here every era
 * prints in full — the hover card, the table and the CSV all carry `1,152,410`,
 * never `1.15M`.
 *
 * Two controls, one question each: **which network** (the Asset Hub chains
 * configured in this build) and **how far back** (in eras — the honest unit, as
 * Polkadot and Kusama eras differ in length). The range is session state:
 * nothing here is worth a stored preference yet.
 */
export const MinStakeModal = memo(({ assets, selected, showFiat, onChainChange, onClose }: Props) => {
  const { t, formatDate } = useI18n();

  const [range, setRange] = useState<EraRangePreset>(DEFAULT_ERA_RANGE);

  const historyDepth = useHistoryDepth(selected.chain);
  const depth = resolveEraDepth(range, historyDepth);
  // No chain while the depth is unresolved: the hook then reports pending
  // without firing a placeholder read.
  const { rows, pending: reading } = useMinStakeRows(
    depth === null ? null : selected.chain,
    selected.asset.precision,
    depth ?? 0,
  );
  const pending = depth === null || reading;

  const assetOptions = useMemo<SegmentedOption<ChainId>[]>(
    () => assets.map((asset) => ({ value: asset.chainId, label: asset.symbol })),
    [assets],
  );
  const rangeOptions = useMemo<SegmentedOption<EraRangePreset>[]>(
    () =>
      ERA_RANGE_PRESETS.map((preset) => ({ value: preset, label: t(`dashboard.staking.minStake.range.${preset}`) })),
    [t],
  );
  const scaleWindow = useMemo(
    () => (rows && rows.length > 0 ? buildWindow(rows.map((row) => row.tokens)) : null),
    [rows],
  );

  const dateOf = useCallback(
    (row: MinStakeRow) => (row.dateMs === null ? '' : formatDate(row.dateMs, ERA_DATE_FORMAT)),
    [formatDate],
  );

  // Newest first: the table answers "what is it now, and before that" — the
  // chart already reads left to right in time.
  const tableRows = useMemo<TableRow[]>(() => {
    if (!rows) return [];

    return rows
      .map<TableRow>((row, index) => {
        const previous = rows[index - 1];

        return {
          key: row.era,
          era: formatEraNumber(row.era),
          date: dateOf(row),
          minStake: `${formatExactTokens(row.tokens)} ${selected.symbol}`,
          change: previous
            ? `${formatSignedTokens(row.tokens - previous.tokens)} · ${formatSignedPercent(row.tokens, previous.tokens)}`
            : '—',
          validators: String(row.validatorCount),
          isActive: row.isActive,
        };
      })
      .reverse();
  }, [rows, dateOf, selected.symbol]);

  const columns = useMemo<Column<TableRow>[]>(
    () => [
      {
        key: 'era',
        title: t('dashboard.staking.minStake.table.era'),
        width: '18%',
        render: (value, item) => (
          <span className="flex items-center gap-2 tabular-nums">
            {String(value)}
            {item.isActive && <Label variant="darkGray">{t('dashboard.staking.minStake.tooltip.active')}</Label>}
          </span>
        ),
      },
      { key: 'date', title: t('dashboard.staking.minStake.table.date'), width: '16%' },
      {
        key: 'minStake',
        title: t('dashboard.staking.minStake.table.minStake'),
        width: '28%',
        render: (value) => <span className="font-semibold tabular-nums">{String(value)}</span>,
      },
      {
        key: 'change',
        title: t('dashboard.staking.minStake.table.change'),
        width: '24%',
        render: (value) => <span className="text-text-secondary tabular-nums">{String(value)}</span>,
      },
      { key: 'validators', title: t('dashboard.staking.minStake.table.validators'), width: '14%' },
    ],
    [t],
  );

  const handleExport = useCallback(() => {
    if (!rows || rows.length === 0) return;

    const csvRows = rows.map<CsvMinStakeRow>((row, index) => ({
      row,
      previous: rows[index - 1],
      chainName: selected.chain.name,
      precision: selected.asset.precision,
      date: row.dateMs === null ? '' : formatDate(row.dateMs, CSV_DATE_FORMAT),
    }));
    const csvColumns = minStakeCsvColumns({
      network: t('dashboard.staking.minStake.csv.network'),
      era: t('dashboard.staking.minStake.csv.era'),
      date: t('dashboard.staking.minStake.csv.date'),
      minStake: t('dashboard.staking.minStake.csv.minStake', { symbol: selected.symbol }),
      change: t('dashboard.staking.minStake.csv.change', { symbol: selected.symbol }),
      validators: t('dashboard.staking.minStake.csv.validators'),
    });

    downloadCsv(
      csvFileName('min-stake', { parts: [selected.chain.name, `${rows.length}-eras`] }),
      buildCsv(csvColumns, csvRows),
    );
  }, [rows, selected, formatDate, t]);

  const current = rows?.at(-1);
  const first = rows?.[0];
  // One narrowing for the whole render: either every piece of the series is
  // there, or the modal is loading / empty.
  const series =
    !pending && rows && current !== undefined && first !== undefined && scaleWindow !== null
      ? { rows, current, first, scaleWindow }
      : null;

  return (
    <Modal isOpen size="xl" height="lg" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('dashboard.staking.minStake.title')}</Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-4 px-5 pt-2 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              value={selected.chainId}
              options={assetOptions}
              label={t('dashboard.staking.minStake.assetSwitch')}
              onChange={onChainChange}
            />
            <SegmentedControl
              value={range}
              options={rangeOptions}
              label={t('dashboard.staking.minStake.rangeSwitch')}
              onChange={setRange}
            />
          </div>

          <div className="flex h-6 items-baseline gap-2">
            {pending ? (
              <Skeleton width="220px" height="22px" />
            ) : series ? (
              <>
                <SmallTitleText className="tabular-nums">
                  {formatAsset(series.current.minStake, selected.asset)}
                </SmallTitleText>
                <FootnoteText className="text-text-tertiary">
                  {t('dashboard.staking.minStake.headlineEra', { era: formatEraNumber(series.current.era) })}
                </FootnoteText>
                {series.current !== series.first && (
                  <Tooltip>
                    <Tooltip.Trigger>
                      <span>
                        <Label variant={series.current.tokens >= series.first.tokens ? 'orange' : 'green'}>
                          {formatSignedPercent(series.current.tokens, series.first.tokens)}
                        </Label>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {t('dashboard.staking.minStake.deltaTitle', {
                        delta: formatSignedTokens(series.current.tokens - series.first.tokens),
                        symbol: selected.symbol,
                        era: formatEraNumber(series.first.era),
                        eras: series.rows.length - 1,
                      })}
                    </Tooltip.Content>
                  </Tooltip>
                )}
                <span className="flex-1" />
                <HelpText className="whitespace-nowrap text-text-tertiary">
                  {t('dashboard.staking.minStake.validatorsPerEra', { validators: series.current.validatorCount })}
                </HelpText>
              </>
            ) : (
              <SmallTitleText className="text-text-tertiary">—</SmallTitleText>
            )}
          </div>

          <div className="flex shrink-0 flex-col" style={{ height: CHART_HEIGHT }}>
            {pending ? (
              <Skeleton width="100%" height="100%" />
            ) : series ? (
              <MinStakeChartArea
                rows={series.rows}
                scaleWindow={series.scaleWindow}
                asset={selected.asset}
                showFiat={showFiat}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-y-1 text-center">
                <FootnoteText className="text-text-tertiary">
                  {t('dashboard.staking.minStake.empty.title')}
                </FootnoteText>
                <HelpText className="text-text-tertiary">
                  {t('dashboard.staking.minStake.empty.description', { chain: selected.chain.name, eras: depth ?? 0 })}
                </HelpText>
              </div>
            )}
          </div>

          {series && (
            <HelpText className="text-text-tertiary">
              {t('dashboard.staking.minStake.zoomNote', {
                floor: formatAxisValue(series.scaleWindow.floor, series.scaleWindow.step),
                symbol: selected.symbol,
              })}
            </HelpText>
          )}

          {series && <Table columns={columns} data={tableRows} truncateHeaders />}
        </div>
      </Modal.Content>
      <Modal.Footer align="between">
        <HelpText className="text-text-tertiary">
          {series
            ? t('dashboard.staking.minStake.footerSummary', { count: series.rows.length, chain: selected.chain.name })
            : ''}
        </HelpText>
        <Button variant="text" size="sm" disabled={!series} onClick={handleExport}>
          {t('dashboard.staking.minStake.exportCsv')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});
