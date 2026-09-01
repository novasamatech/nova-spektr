import { useUnit } from 'effector-react';
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import { type ChainId, type ReferendumId, ConnectionStatus } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance, formatFiatBalance, performSearch } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { TrackInfo, VoteChart } from '@/shared/ui-entities';
import { type Column, SearchInput, Select, Table, Tooltip, useNotification } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { DashboardWidget } from '@/pages/Dashboard';
import { type ActiveReferendum, useActiveReferendums } from '../hooks/useActiveReferendums';
import { type EndedReferendum, useEndedReferendums } from '../hooks/useEndedReferendums';

import { DashboardReferendumDetails } from './DashboardReferendumDetails';
import { EndedReferendumDetailModal } from './EndedReferendumDetailModal';
import { TableSkeleton } from './TableSkeleton';
import { WidgetEmptyState } from './WidgetEmptyState';
import { OUTCOME_I18N_KEY, OUTCOME_STYLES, formatEndDate } from './referendum-helpers';

/**
 * The narrowest the Proposal column may get before the table scrolls sideways
 * instead: the title is the one thing the row is read for, so it is the last
 * column allowed to give up width.
 */
const PROPOSAL_MIN_WIDTH = 240;
/**
 * Fixed-width columns of the Active table, px; the Proposal column takes the
 * rest.
 */
const ACTIVE_COLUMN_WIDTH = { icon: 40, id: 56, track: 192, votes: 160, time: 80, ayeNay: 144, tvl: 110 } as const;
/** Fixed-width columns of the Ended table, px. */
const ENDED_COLUMN_WIDTH = {
  icon: 40,
  id: 56,
  track: 192,
  outcome: 100,
  ended: 110,
  unlockable: 110,
  locks: 60,
} as const;

const sumWidths = (widths: Record<string, number>) => Object.values(widths).reduce((sum, width) => sum + width, 0);

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

const ALL_CHAINS = '__all__';
const HOUR = 3_600_000;
const DAY = 86_400_000;

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '0h';

  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);

  if (days > 0) return `${days}d ${hours}h`;

  return `${hours}h`;
}

type UrgencyLevel = 'normal' | 'warning' | 'critical';

function getUrgency(ms: number): UrgencyLevel {
  if (ms < DAY) return 'critical';
  if (ms < 7 * DAY) return 'warning';

  return 'normal';
}

type FilterableReferendum = { chainId: string; title: string; id: string; chainName: string };

function filterReferendums(refs: ActiveReferendum[], chain: string | null, query: string): ActiveReferendum[];
function filterReferendums(refs: EndedReferendum[], chain: string | null, query: string): EndedReferendum[];
function filterReferendums(refs: FilterableReferendum[], chain: string | null, query: string) {
  const chainFiltered = chain ? refs.filter((ref) => ref.chainId === chain) : refs;

  return performSearch({ records: chainFiltered, query, weights: { title: 10, id: 5, chainName: 3 } });
}

type TabId = 'active' | 'ended';

type ReferendumRow = ActiveReferendum & {
  tvlNumeric: number;
};

export const ReferendumsWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const deferredAccountIds = useDeferredValue(accountIds);
  const [tab, setTab] = useState<TabId>('active');
  const {
    referendums: activeRefs,
    pending: activePending,
    fiatFlag,
  } = useActiveReferendums(deferredAccountIds, allEntries);
  const [selected, setSelected] = useState<{ chainId: ChainId; referendumId: ReferendumId } | null>(null);
  const connectionStatuses = useUnit(networkModel.$connectionStatuses);
  const { toast } = useNotification();
  const [chainFilter, setChainFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [endedCount, setEndedCount] = useState<number | null>(null);

  // Reset stale ended count when accounts change
  const accountIdsKey = accountIds.join(',');
  useEffect(() => {
    setEndedCount(null);
  }, [accountIdsKey]);

  const setActiveTab = useCallback(() => setTab('active'), []);
  const setEndedTab = useCallback(() => setTab('ended'), []);
  const handleChainFilterChange = useCallback(
    (v: string) => setChainFilter(v === ALL_CHAINS ? null : (prev) => (v === prev ? null : v)),
    [],
  );

  const uniqueChains = useMemo(() => {
    const seen = new Map<string, { chainId: string; chainName: string; chainIcon: string }>();
    for (const ref of activeRefs) {
      if (!seen.has(ref.chainId)) {
        seen.set(ref.chainId, { chainId: ref.chainId, chainName: ref.chainName, chainIcon: ref.chainIcon });
      }
    }

    return [...seen.values()];
  }, [activeRefs]);

  const activeRows = useMemo(
    (): ReferendumRow[] =>
      filterReferendums(activeRefs, chainFilter, searchQuery).map((ref) => ({
        ...ref,
        tvlNumeric: parseFloat(ref.totalLockedFiat),
      })),
    [activeRefs, chainFilter, searchQuery],
  );

  // A Votes column that is "—" on every row only takes width from the title;
  // it comes back the moment one of the selected accounts has voted.
  const showVotes = useMemo(() => activeRows.some((row) => row.ourVotes.length > 0), [activeRows]);

  const activeColumns = useMemo((): Column<ReferendumRow>[] => {
    const columns: (Column<ReferendumRow> | null)[] = [
      {
        key: 'chainIcon',
        title: '',
        width: `${ACTIVE_COLUMN_WIDTH.icon}px`,
        render: (_v, row) => <img src={row.chainIcon} alt={row.chainName} width={24} height={24} className="h-6 w-6" />,
      },
      {
        key: 'idNumeric',
        title: t('dashboard.activeReferendums.id'),
        sortable: true,
        width: `${ACTIVE_COLUMN_WIDTH.id}px`,
        render: (_v, row) => <FootnoteText className="font-mono text-text-tertiary">#{row.id}</FootnoteText>,
      },
      {
        key: 'trackId',
        title: t('dashboard.activeReferendums.track'),
        width: `${ACTIVE_COLUMN_WIDTH.track}px`,
        render: (_v, row) => <TrackCell trackId={row.trackId} />,
      },
      {
        key: 'title',
        title: t('dashboard.activeReferendums.proposal'),
        render: (_v, row) => (
          <span title={row.title}>
            <FootnoteText className="line-clamp-2 text-text-primary">{row.title}</FootnoteText>
          </span>
        ),
      },
      showVotes
        ? {
            key: 'ourVotes',
            title: t('dashboard.activeReferendums.votes'),
            width: `${ACTIVE_COLUMN_WIDTH.votes}px`,
            render: (_v, row) => <VoteChipsCell ourVotes={row.ourVotes} t={t} />,
          }
        : null,
      {
        key: 'timeLeftMs',
        title: t('dashboard.activeReferendums.time'),
        sortable: true,
        width: `${ACTIVE_COLUMN_WIDTH.time}px`,
        render: (_v, row) => <TimeLeftCell timeLeftMs={row.timeLeftMs} />,
      },
      {
        key: 'ayePercent',
        title: '',
        width: `${ACTIVE_COLUMN_WIDTH.ayeNay}px`,
        render: (_v, row) => <AyeNayCell ayePercent={row.ayePercent} t={t} />,
      },
      {
        key: 'tvlNumeric',
        title: t('dashboard.activeReferendums.tvl'),
        sortable: true,
        width: `${ACTIVE_COLUMN_WIDTH.tvl}px`,
        render: (_v, row) => <TvlCell referendum={row} />,
      },
    ];

    return columns.filter((column): column is Column<ReferendumRow> => column !== null);
  }, [t, showVotes]);

  const activeMinWidth =
    PROPOSAL_MIN_WIDTH + sumWidths(ACTIVE_COLUMN_WIDTH) - (showVotes ? 0 : ACTIVE_COLUMN_WIDTH.votes);

  // A row whose chain has no live connection cannot open its modal: it is
  // dimmed and inert rather than clickable-then-refused.
  const activeRowProps = useCallback(
    (row: ReferendumRow) => ({ disabled: connectionStatuses[row.chainId] !== ConnectionStatus.CONNECTED }),
    [connectionStatuses],
  );

  const handleActiveRowClick = useCallback(
    (row: ReferendumRow) => {
      // The details modal reads its chain from the governance network selector,
      // which only resolves once the chain is connected.
      if (connectionStatuses[row.chainId] !== ConnectionStatus.CONNECTED) {
        toast.info(t('dashboard.governanceLocks.hint.chainDisconnected'));

        return;
      }

      setSelected({ chainId: row.chainId, referendumId: row.id });
    },
    [connectionStatuses, toast, t],
  );

  if (!fiatFlag) return null;

  if (accountIds.length === 0) {
    return (
      <DashboardWidget>
        <div className="flex h-full min-h-0 flex-col">
          <FootnoteText className="text-text-tertiary">{t('dashboard.activeReferendums.title')}</FootnoteText>
          <WidgetEmptyState
            title={t('dashboard.noSelection.title')}
            description={t('dashboard.noSelection.governanceDescription')}
          />
        </div>
      </DashboardWidget>
    );
  }

  const isActiveTab = tab === 'active';
  const showFilters = isActiveTab ? activeRefs.length > 0 : (endedCount ?? 0) > 0;

  return (
    <>
      <DashboardWidget>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center gap-2">
            <FootnoteText className="text-text-tertiary">{t('dashboard.activeReferendums.title')}</FootnoteText>
          </div>

          {/* Tab bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex gap-1">
              <TabButton
                active={isActiveTab}
                count={activeRefs.length}
                label={t('dashboard.referendums.activeTab')}
                onClick={setActiveTab}
              />
              <TabButton
                active={!isActiveTab}
                count={endedCount}
                label={t('dashboard.referendums.endedTab')}
                onClick={setEndedTab}
              />
            </div>
            {showFilters && (
              <div className="ml-auto flex items-center gap-2">
                <div className="w-[140px]">
                  <Select
                    height="sm"
                    placeholder={t('dashboard.activeReferendums.allChains')}
                    value={chainFilter}
                    onChange={handleChainFilterChange}
                  >
                    <Select.Item value={ALL_CHAINS}>
                      <span>{t('dashboard.activeReferendums.allChains')}</span>
                    </Select.Item>
                    {uniqueChains.map((c) => (
                      <Select.Item key={c.chainId} value={c.chainId}>
                        <div className="flex items-center gap-1.5">
                          <img src={c.chainIcon} alt={c.chainName} className="h-5 w-5" />
                          <span>{c.chainName}</span>
                        </div>
                      </Select.Item>
                    ))}
                  </Select>
                </div>
                <div className="w-[200px]">
                  <SearchInput
                    placeholder={t('dashboard.activeReferendums.searchPlaceholder')}
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active tab content */}
          {isActiveTab && (
            <>
              {activePending && activeRefs.length === 0 && (
                <TableSkeleton columns={['160px', '240px', '80px', '144px', '110px']} />
              )}

              {!activePending && activeRefs.length === 0 && (
                <WidgetEmptyState description={t('dashboard.activeReferendums.noReferendums')} />
              )}

              {activeRefs.length > 0 && activeRows.length === 0 && (
                <WidgetEmptyState description={t('dashboard.activeReferendums.noResults')} />
              )}

              {activeRows.length > 0 && (
                <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain">
                  <div style={{ minWidth: activeMinWidth }}>
                    <Table
                      columns={activeColumns}
                      data={activeRows}
                      rowProps={activeRowProps}
                      stickyHeader
                      onRowClick={handleActiveRowClick}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Ended tab content — lazy-mounted to avoid expensive hooks until needed */}
          {!isActiveTab && (
            <EndedTabContent
              accountIds={deferredAccountIds}
              allEntries={allEntries}
              chainFilter={chainFilter}
              searchQuery={searchQuery}
              onCountChange={setEndedCount}
            />
          )}
        </div>
      </DashboardWidget>

      {selected && <DashboardReferendumDetails {...selected} onClose={() => setSelected(null)} />}
    </>
  );
};

const TabButton = memo(
  ({
    active,
    count,
    label,
    onClick,
  }: {
    active: boolean;
    count: number | null;
    label: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      className={cnTw(
        'flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-footnote font-semibold transition-colors',
        active ? 'bg-selected-background text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
      )}
      onClick={onClick}
    >
      {label}
      {count !== null && (
        <span
          className={cnTw(
            'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-help-text font-semibold',
            active ? 'bg-chip-icon text-white' : 'bg-input-background-disabled text-text-tertiary',
          )}
        >
          {count}
        </span>
      )}
    </button>
  ),
);

const TrackCell = memo(({ trackId }: { trackId: number }) => {
  return <TrackInfo trackId={String(trackId)} />;
});

const VoteChipsCell = memo(
  ({ ourVotes, t }: { ourVotes: ActiveReferendum['ourVotes']; t: ReturnType<typeof useI18n>['t'] }) => {
    const counts = { aye: 0, nay: 0, abstain: 0, split: 0 };
    for (const v of ourVotes) {
      if (v.direction in counts) counts[v.direction as keyof typeof counts]++;
    }

    const chips: { label: string; className: string }[] = [];

    if (counts.aye > 0) {
      chips.push({
        label: `${t('dashboard.activeReferendums.aye')} ×${counts.aye}`,
        className: 'bg-text-positive/10 text-text-positive',
      });
    }
    if (counts.nay > 0) {
      chips.push({
        label: `${t('dashboard.activeReferendums.nay')} ×${counts.nay}`,
        className: 'bg-text-negative/10 text-text-negative',
      });
    }
    if (counts.abstain > 0) {
      chips.push({
        label: `${t('dashboard.activeReferendums.abstain')} ×${counts.abstain}`,
        className: 'bg-text-tertiary/10 text-text-tertiary',
      });
    }
    if (counts.split > 0) {
      chips.push({
        label: `${t('dashboard.activeReferendums.split')} ×${counts.split}`,
        className: 'bg-text-tertiary/10 text-text-tertiary',
      });
    }

    if (chips.length === 0) {
      return <FootnoteText className="text-text-tertiary">&mdash;</FootnoteText>;
    }

    return (
      <div className="flex items-center gap-1">
        {chips.map((chip) => (
          <span key={chip.label} className={cnTw('rounded px-1.5 py-0.5 text-help-text font-medium', chip.className)}>
            {chip.label}
          </span>
        ))}
      </div>
    );
  },
);

const TimeLeftCell = memo(({ timeLeftMs }: { timeLeftMs: number }) => {
  const urgency = getUrgency(timeLeftMs);
  const timeText = formatTimeLeft(timeLeftMs);

  return (
    <div
      className={cnTw('flex items-center gap-1 whitespace-nowrap', {
        'text-text-tertiary': urgency === 'normal',
        'text-text-warning': urgency === 'warning',
        'text-text-negative': urgency === 'critical',
      })}
    >
      {urgency === 'critical' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-negative" />}
      <Icon name="clock" size={14} className="text-inherit" />
      <FootnoteText className="text-inherit">{timeText}</FootnoteText>
    </div>
  );
});

const AyeNayCell = memo(({ ayePercent, t }: { ayePercent: number; t: ReturnType<typeof useI18n>['t'] }) => {
  const ayePct = ayePercent * 100;
  const nayPct = 100 - ayePct;

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div>
          <VoteChart value={ayePct} />
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <FootnoteText className="text-inherit">
          {/* eslint-disable-next-line i18next/no-literal-string */}
          {t('dashboard.activeReferendums.aye')} {ayePct.toFixed(1)}% · {t('dashboard.activeReferendums.nay')}{' '}
          {nayPct.toFixed(1)}%
        </FootnoteText>
      </Tooltip.Content>
    </Tooltip>
  );
});

const TvlCell = memo(({ referendum }: { referendum: ActiveReferendum }) => {
  const { formatted: fiatFormatted } = formatFiatBalance(referendum.totalLockedFiat);
  const { formatted: tokenFormatted } = formatBalance(referendum.totalLocked, referendum.precision);

  return (
    <div className="text-right">
      <FootnoteText className="text-text-primary tabular-nums">
        {tokenFormatted} {referendum.symbol}
      </FootnoteText>
      <FootnoteText className="text-help-text text-text-tertiary tabular-nums">${fiatFormatted}</FootnoteText>
    </div>
  );
});

const OutcomeCell = memo(
  ({ outcome, t }: { outcome: EndedReferendum['outcome']; t: ReturnType<typeof useI18n>['t'] }) => (
    <span className={cnTw('rounded px-1.5 py-0.5 text-help-text font-medium', OUTCOME_STYLES[outcome])}>
      {t(`dashboard.referendums.${OUTCOME_I18N_KEY[outcome]}`)}
    </span>
  ),
);

const UnlockableCell = memo(({ referendum }: { referendum: EndedReferendum }) => {
  const { formatted: tokenFormatted } = formatBalance(referendum.unlockableAmount, referendum.precision);
  const hasUnlockable = referendum.unlockableAmount !== '0';

  // Nothing to release is the common case; a column of "0 DOT" would drown the
  // rows where there is something.
  if (!hasUnlockable) {
    return (
      <div className="text-right">
        <FootnoteText className="text-text-tertiary">&mdash;</FootnoteText>
      </div>
    );
  }

  return (
    <div className="text-right">
      <FootnoteText className="font-semibold whitespace-nowrap text-text-positive tabular-nums">
        {tokenFormatted} {referendum.symbol}
      </FootnoteText>
      {hasUnlockable && (
        <FootnoteText className="text-help-text text-text-tertiary tabular-nums">
          ${formatFiatBalance(referendum.unlockableAmountFiat).formatted}
        </FootnoteText>
      )}
    </div>
  );
});

type EndedTabContentProps = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
  chainFilter: string | null;
  searchQuery: string;
  onCountChange: (count: number) => void;
};

const EndedTabContent = ({ accountIds, allEntries, chainFilter, searchQuery, onCountChange }: EndedTabContentProps) => {
  const { t, formatDate } = useI18n();
  const { referendums: endedRefs, pending: endedPending } = useEndedReferendums(accountIds, allEntries);
  const [selectedEnded, setSelectedEnded] = useState<EndedReferendum | null>(null);

  useEffect(() => {
    onCountChange(endedRefs.length);
  }, [endedRefs.length, onCountChange]);

  const endedRows = useMemo(
    () => filterReferendums(endedRefs, chainFilter, searchQuery),
    [endedRefs, chainFilter, searchQuery],
  );

  const endedColumns = useMemo(
    (): Column<EndedReferendum>[] => [
      {
        key: 'chainIcon',
        title: '',
        width: `${ENDED_COLUMN_WIDTH.icon}px`,
        render: (_v, row) => <img src={row.chainIcon} alt={row.chainName} width={24} height={24} className="h-6 w-6" />,
      },
      {
        key: 'idNumeric',
        title: t('dashboard.activeReferendums.id'),
        sortable: true,
        width: `${ENDED_COLUMN_WIDTH.id}px`,
        render: (_v, row) => <FootnoteText className="font-mono text-text-tertiary">#{row.id}</FootnoteText>,
      },
      {
        key: 'trackId',
        title: t('dashboard.activeReferendums.track'),
        width: `${ENDED_COLUMN_WIDTH.track}px`,
        render: (_v, row) => <TrackCell trackId={row.trackId} />,
      },
      {
        key: 'title',
        title: t('dashboard.activeReferendums.proposal'),
        render: (_v, row) => (
          <span title={row.title}>
            <FootnoteText className="line-clamp-2 text-text-primary">{row.title}</FootnoteText>
          </span>
        ),
      },
      {
        key: 'outcome',
        title: t('dashboard.referendums.outcome'),
        width: `${ENDED_COLUMN_WIDTH.outcome}px`,
        render: (_v, row) => <OutcomeCell outcome={row.outcome} t={t} />,
      },
      {
        key: 'endedAtMs',
        title: t('dashboard.referendums.ended'),
        sortable: true,
        width: `${ENDED_COLUMN_WIDTH.ended}px`,
        render: (_v, row) => (
          <FootnoteText className="whitespace-nowrap text-text-tertiary">
            {formatEndDate(row.endedAtMs, t, formatDate)}
          </FootnoteText>
        ),
      },
      {
        key: 'unlockableAmount',
        title: t('dashboard.referendums.unlockable'),
        width: `${ENDED_COLUMN_WIDTH.unlockable}px`,
        render: (_v, row) => <UnlockableCell referendum={row} />,
      },
      {
        key: 'addressesWithLocks',
        title: t('dashboard.referendums.locks'),
        width: `${ENDED_COLUMN_WIDTH.locks}px`,
        render: (_v, row) => (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-chip-icon px-1.5 text-help-text font-semibold text-white">
            {row.addressesWithLocks}
          </span>
        ),
      },
    ],
    [t],
  );

  const handleEndedRowClick = useCallback((_row: EndedReferendum) => {
    setSelectedEnded(_row);
  }, []);

  return (
    <>
      {endedPending && endedRefs.length === 0 && (
        <TableSkeleton columns={['160px', '240px', '100px', '110px', '110px']} />
      )}

      {!endedPending && endedRefs.length === 0 && (
        <WidgetEmptyState description={t('dashboard.referendums.noEndedReferendums')} />
      )}

      {endedRefs.length > 0 && endedRows.length === 0 && (
        <WidgetEmptyState description={t('dashboard.activeReferendums.noResults')} />
      )}

      {endedRows.length > 0 && (
        <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain">
          <div style={{ minWidth: PROPOSAL_MIN_WIDTH + sumWidths(ENDED_COLUMN_WIDTH) }}>
            <Table columns={endedColumns} data={endedRows} stickyHeader onRowClick={handleEndedRowClick} />
          </div>
        </div>
      )}

      {selectedEnded && (
        <EndedReferendumDetailModal referendum={selectedEnded} onClose={() => setSelectedEnded(null)} />
      )}
    </>
  );
};
