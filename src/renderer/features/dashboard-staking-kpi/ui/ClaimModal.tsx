import { useUnit } from 'effector-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type ChainId, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { buildCsv, downloadCsv } from '@/shared/lib/csv';
import { cnTw, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, CaptionText, FootnoteText, HelpText, SmallTitleText } from '@/shared/ui';
import { getColorByIndex } from '@/shared/ui/chart-constants';
import { type Column, type TableSort, EmptyMessage, Label, Modal, Skeleton, Table, Tooltip } from '@/shared/ui-kit';
import { $accountNameCache, createAccountNameCacheKey } from '@/domains/network';
import { type CurrencyItem } from '@/domains/price';
import { type StakingPosition } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { useRawRewardPayouts } from '../hooks/useRawRewardPayouts';
import { useSignableChains } from '../hooks/useSignableChains';
import { useStakingChainAssets } from '../hooks/useStakingChainAssets';
import { useValidatorRewards } from '../hooks/useValidatorRewards';
import { formatAssetAmountExact, sumFiat } from '../lib/amounts';
import { csvFileName, rawPayoutCsvColumns } from '../lib/csv';
import { DEFAULT_CLAIM_WINDOW_ERAS, daysUntilExpiry, erasUntilExpiry, oldestPayoutEra } from '../lib/expiry';
import { formatFiat } from '../lib/format-fiat';
import {
  type RewardWindow,
  DEFAULT_REWARD_WINDOW,
  isCustomWindowPending,
  windowBounds,
  windowSlug,
} from '../lib/reward-period';
import { DEFAULT_REWARD_SORT, isRewardSortColumn, sortRewardRows } from '../lib/reward-sorting';
import { type ClaimRow } from '../lib/types';
import {
  type ValidatorRewardRow,
  buildValidatorRewardRows,
  isRowClaimable,
  toClaimRequests,
} from '../lib/validator-rewards';
import { dashboardStakingKpiActions } from '../model/actions';

import { DonutBreakdown } from './DonutBreakdown';
import { PeriodTabs } from './PeriodTabs';
import { Price } from './Price';
import { RewardsTableSkeleton } from './RewardsTableSkeleton';
import { SliceDot, SliceHoverProvider } from './SliceHover';
import { type RewardColumnKey, rewardColumnWidth } from './rewardColumnLayout';

type Props = {
  /** Per (chain, account) claim data — where the unclaimed payouts come from. */
  rows: ClaimRow[];
  /** The positions behind them; the era attribution is fetched per chain. */
  positions: StakingPosition[];
  currency: CurrencyItem | null;
  /** Active era per chain — turns a payout era into an expiry countdown. */
  eras: Record<string, number | undefined>;
  eraDurations: Record<string, number | null>;
  /** Runtime `HistoryDepth` per chain — how far back a payout stays claimable. */
  historyDepths: Record<string, number | null>;
  walletByAccount: Record<string, Wallet | null>;
  onClose: () => void;
};

type DisplayRow = ValidatorRewardRow & { color: string; accruedFiat: string; expiryDays: number | null };

// Stable empty selection — a fresh [] per render would re-key the memos below.
const NO_POSITIONS: StakingPosition[] = [];

/** A segmented-control button, styled like `Tabs.Trigger` without its panels. */
const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    className={cnTw(
      'cursor-pointer rounded-sm px-3 py-1 text-button-small transition-all duration-100',
      active ? 'bg-white text-text-primary shadow-card-shadow' : 'text-text-secondary hover:text-text-primary',
    )}
    onClick={onClick}
  >
    {label}
  </button>
);

/**
 * The Rewards drill-down, seen from the validator.
 *
 * That is the chain's own unit: a payout is `payout_stakers_by_page(validator,
 * era, page)`, anyone may submit it, and it pays every nominator in the page at
 * once. A per-account list therefore invites the same call to be sent twice —
 * once per account of ours behind the same validator — while a per-validator
 * list sends it once and credits both.
 *
 * The two figures on the row answer different questions and are never mixed:
 * **earned** is the era's arithmetic over the chosen window, **unclaimed** is
 * what the chain still owes. The period tabs move the first and the export;
 * they deliberately leave the claim list alone, because a payout expires by era
 * and hiding part of it behind a date filter hides money.
 */
export const ClaimModal = memo(
  ({ rows, positions, currency, eras, eraDurations, historyDepths, walletByAccount, onClose }: Props) => {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const accountNameCache = useUnit($accountNameCache);
    const enabledActions = useUnit(dashboardStakingKpiActions.$enabledActions);
    const claimEnabled = enabledActions.includes('claim');
    const claimRequested = useUnit(dashboardStakingKpiActions.claimRequested);
    const { toFiat } = useStakingChainAssets();
    const signableChains = useSignableChains();
    const blockedChains = useUnit(dashboardStakingKpiActions.$blockedClaimChains);

    const [rewardWindow, setRewardWindow] = useState<RewardWindow>(DEFAULT_REWARD_WINDOW);
    /**
     * A Custom tab with no dates yet. Nothing is fetched or reported for it —
     * an unbounded window would quietly read as "all time" behind a tab that
     * says "custom".
     */
    const windowPending = isCustomWindowPending(rewardWindow);
    const [chainFilter, setChainFilter] = useState<ChainId | null>(null);
    const [nominatorFilter, setNominatorFilter] = useState<AccountId | null>(null);
    const [tableSort, setTableSort] = useState<TableSort>(DEFAULT_REWARD_SORT);
    const [hovered, setHovered] = useState<{ id: string; from: 'donut' | 'row' } | null>(null);
    const hoveredId = hovered?.id ?? null;
    const listRef = useRef<HTMLDivElement>(null);

    const { rewards, pendingChains } = useValidatorRewards(windowPending ? NO_POSITIONS : positions, rewardWindow);
    const pendingChainSet = useMemo(() => new Set(pendingChains), [pendingChains]);

    /**
     * Chains whose payout scan has not answered yet.
     *
     * Until it does, "unclaimed" is unknown rather than zero — and the footer
     * must not announce "nothing outstanding" for money it has not looked for.
     */
    const unclaimedPending = useMemo(() => {
      const chainIds = new Set<ChainId>();
      for (const row of rows) {
        if (!row.unclaimedKnown) chainIds.add(row.chainId);
      }

      return chainIds;
    }, [rows]);

    /** Networks the selection actually stakes on — never a hard-coded list. */
    const networks = useMemo(() => {
      const byChain = new Map<ChainId, string>();
      for (const row of rows) {
        byChain.set(row.chainId, row.chainName);
      }

      return [...byChain.entries()].map(([chainId, chainName]) => ({ chainId, chainName }));
    }, [rows]);

    /**
     * The claim window the "nothing outstanding" footer is allowed to promise.
     *
     * `HistoryDepth` is per chain while this line speaks for every network in
     * the table at once, so the **smallest** depth is the only figure true of
     * all of them: a chain with a deeper window has its payouts claimed too,
     * whereas quoting the deepest would vouch for eras a shallower chain can no
     * longer even be asked about. Polkadot and Kusama both run 84 today, so
     * this only shows once they diverge — reading the first row's chain would
     * have silently spoken for the others.
     */
    const claimWindowEras = useMemo(() => {
      const depths = [...new Set(rows.map((row) => row.chainId))].map(
        (chainId) => historyDepths[chainId] ?? DEFAULT_CLAIM_WINDOW_ERAS,
      );

      return depths.length === 0 ? DEFAULT_CLAIM_WINDOW_ERAS : Math.min(...depths);
    }, [rows, historyDepths]);

    const scopedClaimRows = useMemo(
      () =>
        rows.filter(
          (row) =>
            (chainFilter === null || row.chainId === chainFilter) &&
            (nominatorFilter === null || row.accountId === nominatorFilter),
        ),
      [rows, chainFilter, nominatorFilter],
    );

    const scopedRewards = useMemo(
      () =>
        rewards.filter(
          (reward) =>
            (chainFilter === null || reward.chainId === chainFilter) &&
            (nominatorFilter === null || reward.accountId === nominatorFilter),
        ),
      [rewards, chainFilter, nominatorFilter],
    );

    const validatorRows = useMemo(
      () => buildValidatorRewardRows({ claimRows: scopedClaimRows, rewards: scopedRewards, toFiat }),
      [scopedClaimRows, scopedRewards, toFiat],
    );

    /** Accounts of ours that are themselves validators — flags the rail entry. */
    const validatorAccounts = useMemo(
      () =>
        new Set(positions.filter((position) => position.kind === 'validator').map((position) => position.accountId)),
      [positions],
    );

    /**
     * Every account of ours the network filter leaves in scope, with what it
     * earned — the rail under the donut, and the filter itself.
     *
     * Built from the network-scoped data but **not** from the nominator-scoped
     * data: a filter that hides its own alternatives is a trap.
     */
    const nominators = useMemo(() => {
      const byAccount = new Map<AccountId, { accountId: AccountId; chainId: ChainId; fiat: string }>();

      for (const row of rows) {
        if (chainFilter !== null && row.chainId !== chainFilter) continue;
        if (!byAccount.has(row.accountId)) {
          byAccount.set(row.accountId, { accountId: row.accountId, chainId: row.chainId, fiat: '0' });
        }
      }

      for (const reward of rewards) {
        if (chainFilter !== null && reward.chainId !== chainFilter) continue;
        const entry = byAccount.get(reward.accountId);
        if (!entry) continue;

        entry.fiat = sumFiat([entry.fiat, toFiat(reward.chainId, reward.amount)]);
      }

      return [...byAccount.values()].sort((a, b) => Number(b.fiat) - Number(a.fiat));
    }, [rows, rewards, chainFilter, toFiat]);

    /**
     * Fiat is resolved **once per row** here and read from the row everywhere
     * else. It used to be recomputed inside four separate memos and again in
     * every cell — a `BigNumber` conversion per row per render, for a figure
     * that cannot change without the row changing.
     */
    const displayRows = useMemo<DisplayRow[]>(() => {
      const withFiat = validatorRows.map((row) => {
        const oldest = oldestPayoutEra(row.eras);
        const activeEra = eras[row.chainId];
        const expiryDays =
          oldest === null || activeEra === undefined
            ? null
            : daysUntilExpiry(
                erasUntilExpiry(oldest, activeEra, historyDepths[row.chainId] ?? undefined),
                eraDurations[row.chainId] ?? null,
              );

        return { ...row, accruedFiat: toFiat(row.chainId, row.accrued), expiryDays, color: '' };
      });

      // Positional colour by size, so the biggest slice always takes the first
      // colour of the palette — the rows themselves stay in claim order.
      const bySize = [...withFiat].sort((a, b) => Number(b.accruedFiat) - Number(a.accruedFiat));
      for (const [index, row] of bySize.entries()) {
        row.color = getColorByIndex(index);
      }

      return withFiat;
    }, [validatorRows, eras, eraDurations, historyDepths, toFiat]);

    /**
     * The validator name each row **displays**, keyed by row key — read from
     * the cache the table's own `NamedAccount` cells fill, so sorting by name
     * always agrees with what is on screen and re-sorts as identities land.
     * Until a name resolves the cell shows the SS58 address; so does the sort.
     */
    const validatorNames = useMemo(() => {
      const names: Record<string, string> = {};
      for (const row of displayRows) {
        const chain = chains[row.chainId];
        const cached = accountNameCache[createAccountNameCacheKey({ accountId: row.validatorId, chain })];
        names[row.key] = cached ?? toAddress(row.validatorId, { prefix: chain?.addressPrefix });
      }

      return names;
    }, [displayRows, accountNameCache, chains]);

    /**
     * The table's own view of `displayRows` — the only consumer of the header
     * sort. The donut slices, totals, claimable set, hover lookup and CSV all
     * keep reading `displayRows`, so sorting the table never reshuffles or
     * recolors the chart.
     */
    const tableRows = useMemo(
      () =>
        isRewardSortColumn(tableSort.column)
          ? sortRewardRows(displayRows, tableSort.column, tableSort.direction, validatorNames)
          : displayRows,
      [displayRows, tableSort, validatorNames],
    );

    const slices = useMemo(
      () =>
        displayRows
          .filter((row) => Number(row.accruedFiat) > 0)
          .map((row) => ({ id: row.key, value: Number(row.accruedFiat), color: row.color }))
          .sort((a, b) => b.value - a.value),
      [displayRows],
    );

    const accruedTotalFiat = useMemo(() => sumFiat(displayRows.map((row) => row.accruedFiat)), [displayRows]);

    const claimable = useMemo(
      () => displayRows.filter((row) => isRowClaimable(row, signableChains)),
      [displayRows, signableChains],
    );
    const unclaimedTotalFiat = useMemo(() => sumFiat(displayRows.map((row) => row.unclaimedFiat)), [displayRows]);
    const payoutCount = useMemo(() => claimable.reduce((count, row) => count + row.payouts.length, 0), [claimable]);

    const hoveredRow = hoveredId === null ? null : (displayRows.find((row) => row.key === hoveredId) ?? null);

    const soonestExpiry = useMemo(() => {
      const values = claimable.map((row) => row.expiryDays).filter((days): days is number => days !== null);

      return values.length > 0 ? Math.min(...values) : null;
    }, [claimable]);

    /**
     * Following a slice with the eye is useless if its row is fifty pixels
     * below the fold, so pointing at the donut brings the row to it.
     *
     * Only when the hover came from the donut: scrolling the list because the
     * pointer is already on a row would fight the user's own scrolling.
     */
    useEffect(() => {
      if (hovered?.from !== 'donut') return;

      const row = listRef.current?.querySelector(`[data-row="${CSS.escape(hovered.id)}"]`);
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [hovered]);

    const handleDonutHover = useCallback((id: string | null) => {
      setHovered(id === null ? null : { id, from: 'donut' });
    }, []);

    const handleRowEnter = useCallback((id: string) => setHovered({ id, from: 'row' }), []);
    const handleRowLeave = useCallback(() => setHovered(null), []);
    const hoverValue = useMemo(() => ({ hoveredId }), [hoveredId]);

    /**
     * One request per chain over the **whole** selection, deliberately not the
     * filtered one.
     *
     * The request key is (chain, accounts), so scoping it to the filters would
     * refetch a year of payout history on every filter click and cache a
     * separate copy per combination. The filters are applied to the rows once
     * they are here, which is free.
     */
    const payoutRequests = useMemo(() => {
      const byChain = new Map<ChainId, AccountId[]>();
      for (const row of rows) {
        const accounts = byChain.get(row.chainId) ?? [];
        if (!accounts.includes(row.accountId)) accounts.push(row.accountId);
        byChain.set(row.chainId, accounts);
      }

      return [...byChain.entries()].map(([chainId, accountIds]) => ({ chainId, accountIds: accountIds.sort() }));
    }, [rows]);

    const rawPayouts = useRawRewardPayouts(payoutRequests);

    const bounds = windowBounds(rewardWindow);
    const windowedPayouts = useMemo(() => {
      if (windowPending) return [];

      return rawPayouts.filter(
        (payout) =>
          (bounds.from === null || payout.timestamp >= bounds.from) &&
          (bounds.to === null || payout.timestamp <= bounds.to) &&
          (chainFilter === null || payout.chainId === chainFilter) &&
          // The indexer speaks addresses; the filter speaks account ids.
          (nominatorFilter === null || toAccountId(payout.address) === nominatorFilter),
      );
    }, [rawPayouts, windowPending, bounds.from, bounds.to, chainFilter, nominatorFilter]);

    /**
     * Exports the indexer's own payout rows, scoped to the period on screen.
     *
     * The table answers "who earns for me and what is outstanding"; the export
     * answers "what was paid, and when" — one line per payout with its block,
     * so the file can be reconciled against the chain. A sum cannot be.
     */
    const handleExport = useCallback(() => {
      const precisionByChain: Record<string, number> = {};
      for (const row of scopedClaimRows) {
        precisionByChain[row.chainId] = row.precision;
      }

      const columns = rawPayoutCsvColumns(
        {
          id: t('dashboard.staking.kpi.columns.payoutId'),
          block: t('dashboard.staking.kpi.columns.block'),
          date: t('dashboard.staking.kpi.columns.date'),
          network: t('dashboard.staking.kpi.columns.network'),
          address: t('dashboard.staking.kpi.columns.address'),
          type: t('dashboard.staking.kpi.columns.payoutType'),
          amount: t('dashboard.staking.kpi.columns.amount'),
        },
        precisionByChain,
      );

      // The file says what it holds: a folder of exports is unreadable when
      // three of them differ only by a filter nobody wrote down.
      const network =
        chainFilter === null ? 'all-networks' : (networks.find((n) => n.chainId === chainFilter)?.chainName ?? '');

      downloadCsv(
        csvFileName('reward-payouts', { parts: [network, windowSlug(rewardWindow)] }),
        buildCsv(columns, windowedPayouts),
      );
    }, [windowedPayouts, scopedClaimRows, chainFilter, networks, rewardWindow, t]);

    const handleClaimRow = useCallback(
      (row: ValidatorRewardRow) => claimRequested({ requests: toClaimRequests([row], signableChains) }),
      [claimRequested, signableChains],
    );

    const handleClaimAll = useCallback(
      () => claimRequested({ requests: toClaimRequests(claimable, signableChains) }),
      [claimRequested, claimable, signableChains],
    );

    /** Shared with the loading table, so its header is the real one. */
    const columnTitles = useMemo<Record<RewardColumnKey, string>>(
      () => ({
        validatorId: t('dashboard.staking.kpi.rewards.validatorColumn'),
        nominators: t('dashboard.staking.kpi.rewards.nominatorsColumn'),
        accrued: t('dashboard.staking.kpi.rewards.earnedColumn'),
        unclaimed: t('dashboard.staking.kpi.columns.unclaimed'),
        payouts: t('dashboard.staking.kpi.columns.actions'),
      }),
      [t],
    );

    const columns = useMemo<Column<DisplayRow>[]>(
      () => [
        {
          key: 'validatorId',
          title: columnTitles.validatorId,
          sortable: true,
          width: rewardColumnWidth('validatorId'),
          render: (_, item) => (
            <div
              // The anchor the donut scrolls to; the row itself is rendered by
              // `Table`, so the handle has to live in a cell.
              data-row={item.key}
              className="flex min-w-0 items-center gap-x-2"
              onMouseEnter={() => handleRowEnter(item.key)}
              onMouseLeave={handleRowLeave}
            >
              <SliceDot id={item.key} color={item.color} />
              <div className="min-w-0">
                <NamedAccount
                  accountId={item.validatorId}
                  chain={chains[item.chainId]}
                  titleClass="truncate font-semibold"
                  variant="short"
                  iconSize={24}
                  hideExplorers
                />
                <HelpText className="text-text-tertiary">{item.chainName}</HelpText>
              </div>
              {item.isSelf ? (
                <div className="shrink-0">
                  <Label variant="gray">{t('dashboard.staking.kpi.rewards.myValidatorBadge')}</Label>
                </div>
              ) : null}
            </div>
          ),
        },
        {
          key: 'nominators',
          title: columnTitles.nominators,
          sortable: true,
          width: rewardColumnWidth('nominators'),
          render: (_, item) => {
            // A validator's own row lists itself among its `nominators` (the
            // chain does not distinguish self-stake from backing); counting it
            // as a backer would claim credit the validator gave itself.
            const backerCount = item.isSelf
              ? item.nominators.filter((accountId) => accountId !== item.validatorId).length
              : item.nominators.length;

            return (
              <Tooltip>
                <Tooltip.Trigger>
                  <div className="w-fit">
                    <Label variant="gray">
                      {item.isSelf
                        ? backerCount === 0
                          ? t('dashboard.staking.kpi.rewards.selfNominator')
                          : t('dashboard.staking.kpi.rewards.selfNominatorPlus', { count: backerCount })
                        : t('dashboard.staking.kpi.nominations.nominatorsValue', { count: item.nominators.length })}
                    </Label>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <div className="flex max-w-64 flex-col gap-1">
                    {item.nominators.map((accountId) => (
                      <NamedAccount
                        key={accountId}
                        accountId={accountId}
                        chain={chains[item.chainId]}
                        wallet={walletByAccount[accountId]}
                        variant="short"
                        iconSize={16}
                        hideExplorers
                      />
                    ))}
                  </div>
                </Tooltip.Content>
              </Tooltip>
            );
          },
        },
        {
          key: 'accrued',
          title: columnTitles.accrued,
          sortable: true,
          width: rewardColumnWidth('accrued'),
          render: (_, item) =>
            // A row exists as soon as something is unclaimed on it, but what it
            // earned needs the era replay. Until that lands the cell shimmers:
            // printing `0 DOT` would state a fact nobody has established yet.
            pendingChainSet.has(item.chainId) ? (
              <div className="flex flex-col gap-1">
                <Skeleton width="72px" height="14px" />
                <Skeleton width="48px" height="10px" />
              </div>
            ) : (
              <div>
                <FootnoteText className="tabular-nums">
                  {formatAssetAmountExact({ symbol: item.symbol, precision: item.precision, amount: item.accrued })}
                </FootnoteText>
                <HelpText className="text-text-tertiary tabular-nums">
                  <Price amount={item.accruedFiat} currency={currency} />
                </HelpText>
              </div>
            ),
        },
        {
          key: 'unclaimed',
          title: columnTitles.unclaimed,
          sortable: true,
          width: rewardColumnWidth('unclaimed'),
          render: (_, item) =>
            unclaimedPending.has(item.chainId) ? (
              <Skeleton width="64px" height="14px" />
            ) : (
              <div>
                <FootnoteText className={cnTw('tabular-nums', Number(item.unclaimed) > 0 && 'text-text-positive')}>
                  {formatAssetAmountExact({ symbol: item.symbol, precision: item.precision, amount: item.unclaimed })}
                </FootnoteText>
                {item.eras.length > 0 && (
                  <HelpText className="text-text-tertiary">
                    {t('dashboard.staking.kpi.rewards.eraCount', { count: item.eras.length })}
                  </HelpText>
                )}
              </div>
            ),
        },
        {
          key: 'payouts',
          title: <span className="block text-end">{columnTitles.payouts}</span>,
          width: rewardColumnWidth('payouts'),
          render: (_, item) => {
            if (item.payouts.length === 0) return null;

            const noSigner = !signableChains.has(item.chainId);
            const disabled = !claimEnabled || noSigner;

            return (
              <div className="flex justify-end">
                <Tooltip open={disabled ? undefined : false}>
                  <Tooltip.Trigger>
                    <div>
                      <Button variant="chip" size="sm" disabled={disabled} onClick={() => handleClaimRow(item)}>
                        {t('dashboard.staking.kpi.rewards.claim')}
                      </Button>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {noSigner
                      ? t('dashboard.staking.kpi.rewards.noSigner', { network: item.chainName })
                      : t('dashboard.staking.kpi.actionUnavailable')}
                  </Tooltip.Content>
                </Tooltip>
              </div>
            );
          },
        },
      ],
      [
        columnTitles,
        t,
        chains,
        walletByAccount,
        currency,
        claimEnabled,
        pendingChainSet,
        unclaimedPending,
        signableChains,
        handleClaimRow,
        handleRowEnter,
        handleRowLeave,
      ],
    );

    const loading = pendingChains.length > 0;

    // Same footprint as the validator-selection modal: the two screens are both
    // "work through a validator list" surfaces and should feel alike.
    return (
      <Modal isOpen size="3xl" height="full" onToggle={(open) => !open && onClose()}>
        <Modal.Title close>{t('dashboard.staking.kpi.rewards.detailTitle')}</Modal.Title>
        <Modal.Content disableScroll>
          {rows.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyMessage
                title={t('dashboard.staking.kpi.empty.title')}
                description={t('dashboard.staking.kpi.empty.description')}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-3 px-5 pt-2 pb-4">
              {/* No "received in period" figure next to the tabs: the donut
                already totals what the window EARNED, and a second, always
                slightly different number (actual payouts land on their own
                clock) read as a discrepancy rather than a different fact. */}
              <div className="flex items-center justify-end gap-4">
                <PeriodTabs value={rewardWindow} onChange={setRewardWindow} />
              </div>

              {/* One network is not a choice — the filter appears with the second. */}
              {networks.length > 1 && (
                <div className="flex w-fit shrink-0 items-center gap-x-1 rounded-md bg-tab-background p-0.5">
                  <FilterChip
                    label={t('dashboard.staking.kpi.rewards.allNetworks')}
                    active={chainFilter === null}
                    onClick={() => setChainFilter(null)}
                  />
                  {networks.map((network) => (
                    <FilterChip
                      key={network.chainId}
                      label={network.chainName}
                      active={chainFilter === network.chainId}
                      onClick={() => setChainFilter(network.chainId)}
                    />
                  ))}
                </div>
              )}

              <SliceHoverProvider value={hoverValue}>
                <div className="flex min-h-0 flex-1 gap-6">
                  <div className="flex w-52 shrink-0 flex-col items-center gap-2 overflow-y-auto">
                    {loading && slices.length === 0 ? (
                      <Skeleton circle width="180px" />
                    ) : (
                      <DonutBreakdown data={slices} hoveredId={hoveredId} onHover={handleDonutHover}>
                        {hoveredRow ? (
                          <>
                            <FootnoteText className="font-bold">
                              <Price amount={hoveredRow.accruedFiat} currency={currency} />
                            </FootnoteText>
                            <HelpText className="text-text-tertiary">
                              {t('dashboard.staking.kpi.nominations.nominatorsValue', {
                                count: hoveredRow.nominators.length,
                              })}
                            </HelpText>
                          </>
                        ) : (
                          <>
                            <SmallTitleText>{formatFiat(accruedTotalFiat, currency)}</SmallTitleText>
                            <HelpText className="text-text-tertiary">
                              {t('dashboard.staking.kpi.rewards.validatorCount', { count: displayRows.length })}
                            </HelpText>
                          </>
                        )}
                      </DonutBreakdown>
                    )}

                    <HelpText className="text-center text-text-tertiary">
                      {t('dashboard.staking.kpi.rewards.donutCaption')}
                    </HelpText>

                    {/* The accounts behind the donut, and the filter over them —
                      the space under a 180px ring is exactly one list wide. */}
                    <div className="mt-2 flex w-full shrink-0 flex-col gap-1 border-t border-divider pt-2">
                      <HelpText className="text-text-tertiary uppercase">
                        {t('dashboard.staking.kpi.rewards.accountsRail')}
                      </HelpText>
                      {nominators.map((nominator) => {
                        const active = nominatorFilter === nominator.accountId;

                        return (
                          <button
                            key={nominator.accountId}
                            type="button"
                            aria-pressed={active}
                            className={cnTw(
                              'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1 text-start transition-colors',
                              // `background-item-hover` is the dark dropdown token — on a
                              // white rail it paints a black slab. The table rows next to
                              // it hover with `action-background-hover`; so does this.
                              active ? 'bg-action-background-hover' : 'hover:bg-action-background-hover',
                            )}
                            // Clicking the active one clears the filter — a filter
                            // with no way back out is a trap.
                            onClick={() => setNominatorFilter(active ? null : nominator.accountId)}
                          >
                            <div className="min-w-0 flex-1">
                              <NamedAccount
                                accountId={nominator.accountId}
                                chain={chains[nominator.chainId]}
                                wallet={walletByAccount[nominator.accountId]}
                                titleClass={cnTw('truncate', active && 'font-semibold')}
                                variant="short"
                                iconSize={16}
                                hideExplorers
                              />
                            </div>
                            {validatorAccounts.has(nominator.accountId) ? (
                              <div className="flex h-4.5 shrink-0 items-center rounded-full bg-input-background-disabled px-1.5">
                                <CaptionText className="text-text-secondary">
                                  {t('dashboard.staking.positions.validatorChip')}
                                </CaptionText>
                              </div>
                            ) : null}
                            {windowPending ? null : pendingChainSet.has(nominator.chainId) ? (
                              <Skeleton width="56px" height="12px" />
                            ) : (
                              <HelpText className="shrink-0 text-text-tertiary tabular-nums">
                                {formatFiat(nominator.fiat, currency)}
                              </HelpText>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div ref={listRef} className="min-w-0 flex-1 overflow-y-auto">
                    {windowPending ? (
                      <FootnoteText className="px-3 py-6 text-text-tertiary">
                        {t('dashboard.staking.kpi.rewards.period.pickDates')}
                      </FootnoteText>
                    ) : displayRows.length === 0 ? (
                      loading ? (
                        <RewardsTableSkeleton titles={columnTitles} />
                      ) : (
                        <FootnoteText className="px-3 py-6 text-text-tertiary">
                          {t('dashboard.staking.kpi.rewards.nothingInPeriod')}
                        </FootnoteText>
                      )
                    ) : (
                      <Table
                        columns={columns}
                        data={tableRows}
                        sort={tableSort}
                        // A third click reports `null` — treat it as back to default,
                        // never as "whatever order the rows happen to be in".
                        getRowKey={(item) => item.key}
                        stickyHeader
                        onSortChange={(sort) =>
                          setTableSort(sort && isRewardSortColumn(sort.column) ? sort : DEFAULT_REWARD_SORT)
                        }
                      />
                    )}
                  </div>
                </div>
              </SliceHoverProvider>
            </div>
          )}
        </Modal.Content>

        {rows.length > 0 && (
          <Modal.Footer align="between">
            <FootnoteText className="text-text-tertiary">
              {blockedChains.length > 0
                ? t('dashboard.staking.kpi.rewards.noSigner', {
                    network: blockedChains.map((chain) => chain.chainName).join(', '),
                  })
                : unclaimedPending.size > 0
                  ? t('dashboard.staking.kpi.rewards.scanningPayouts')
                  : payoutCount === 0
                    ? t('dashboard.staking.kpi.rewards.nothingToClaim', { eras: claimWindowEras })
                    : [
                        t('dashboard.staking.kpi.rewards.outstanding', {
                          fiat: formatFiat(unclaimedTotalFiat, currency),
                          count: claimable.length,
                        }),
                        // The expiry warning sits next to the button that acts on
                        // it, not under a chart on the other side of the screen.
                        soonestExpiry === null
                          ? null
                          : t('dashboard.staking.kpi.rewards.oldestExpires', { count: soonestExpiry }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
            </FootnoteText>
            <div className="flex items-center gap-2">
              <Button variant="text" size="sm" disabled={windowPending} onClick={handleExport}>
                {t('dashboard.staking.kpi.exportCsv')}
              </Button>
              <Tooltip open={claimEnabled ? false : undefined}>
                <Tooltip.Trigger>
                  <div>
                    <Button size="sm" disabled={!claimEnabled || payoutCount === 0} onClick={handleClaimAll}>
                      {t('dashboard.staking.kpi.rewards.claimAll')}
                    </Button>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('dashboard.staking.kpi.actionUnavailable')}</Tooltip.Content>
              </Tooltip>
            </div>
          </Modal.Footer>
        )}
      </Modal>
    );
  },
);
