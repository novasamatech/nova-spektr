import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance, formatFiatBalance, performSearch } from '@/shared/lib/utils';
import { type IconNames, BodyText, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { VoteChart } from '@/shared/ui-entities';
import { type Column, SearchInput, Select, Skeleton, Table, Tooltip } from '@/shared/ui-kit';
import { DashboardWidget } from '@/pages/Dashboard';
import { type ActiveReferendum, useActiveReferendums } from '../hooks/useActiveReferendums';
import { type EndedReferendum, useEndedReferendums } from '../hooks/useEndedReferendums';

import { EndedReferendumDetailModal } from './EndedReferendumDetailModal';
import { ReferendumDetailModal } from './ReferendumDetailModal';
import { OUTCOME_I18N_KEY, OUTCOME_STYLES, formatEndDate } from './referendum-helpers';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

const HOUR = 3_600_000;
const DAY = 86_400_000;

const TRACK_MAP: Record<number, { title: string; icon: IconNames }> = {
  0: { title: 'governance.referendums.mainAgenda', icon: 'polkadot' },
  1: { title: 'governance.referendums.fellowshipWhitelist', icon: 'fellowship' },
  2: { title: 'governance.referendums.wishForChange', icon: 'voting' },
  10: { title: 'governance.referendums.staking', icon: 'stake' },
  11: { title: 'governance.referendums.treasuryAny', icon: 'treasury' },
  12: { title: 'governance.referendums.governanceLease', icon: 'voting' },
  13: { title: 'governance.referendums.fellowshipAdmin', icon: 'fellowship' },
  14: { title: 'governance.referendums.governanceRegistrar', icon: 'voting' },
  15: { title: 'governance.referendums.crowdloans', icon: 'rocket' },
  20: { title: 'governance.referendums.governanceCanceller', icon: 'voting' },
  21: { title: 'governance.referendums.governanceKiller', icon: 'voting' },
  30: { title: 'governance.referendums.treasurySmallTips', icon: 'treasury' },
  31: { title: 'governance.referendums.treasuryBigTips', icon: 'treasury' },
  32: { title: 'governance.referendums.treasurySmallSpend', icon: 'treasury' },
  33: { title: 'governance.referendums.treasuryMediumSpend', icon: 'treasury' },
  34: { title: 'governance.referendums.treasuryBigSpend', icon: 'treasury' },
};

function getTrackInfo(trackId: number): { title: string; icon: IconNames } {
  return TRACK_MAP[trackId] ?? { title: 'dashboard.activeReferendums.unknownTrack', icon: 'voting' };
}

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
  const [tab, setTab] = useState<TabId>('active');
  const { referendums: activeRefs, pending: activePending, fiatFlag } = useActiveReferendums(accountIds, allEntries);
  const { referendums: endedRefs, pending: endedPending } = useEndedReferendums(accountIds, allEntries);
  const [selectedActive, setSelectedActive] = useState<ActiveReferendum | null>(null);
  const [selectedEnded, setSelectedEnded] = useState<EndedReferendum | null>(null);
  const [chainFilter, setChainFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueChains = useMemo(() => {
    const seen = new Map<string, { chainId: string; chainName: string; chainIcon: string }>();
    for (const ref of [...activeRefs, ...endedRefs]) {
      if (!seen.has(ref.chainId)) {
        seen.set(ref.chainId, { chainId: ref.chainId, chainName: ref.chainName, chainIcon: ref.chainIcon });
      }
    }

    return [...seen.values()];
  }, [activeRefs, endedRefs]);

  const activeRows = useMemo(
    (): ReferendumRow[] =>
      filterReferendums(activeRefs, chainFilter, searchQuery).map((ref) => ({
        ...ref,
        tvlNumeric: parseFloat(ref.totalLockedFiat),
      })),
    [activeRefs, chainFilter, searchQuery],
  );

  const endedRows = useMemo(
    () => filterReferendums(endedRefs, chainFilter, searchQuery),
    [endedRefs, chainFilter, searchQuery],
  );

  const activeColumns = useMemo(
    (): Column<ReferendumRow>[] => [
      {
        key: 'chainIcon',
        title: '',
        width: '52px',
        render: (_v, row) => <img src={row.chainIcon} alt={row.chainName} className="h-10 w-10" />,
      },
      {
        key: 'idNumeric',
        title: t('dashboard.activeReferendums.id'),
        sortable: true,
        width: '56px',
        render: (_v, row) => <FootnoteText className="font-mono text-text-tertiary">#{row.id}</FootnoteText>,
      },
      {
        key: 'trackId',
        title: t('dashboard.activeReferendums.track'),
        width: '192px',
        render: (_v, row) => <TrackCell trackId={row.trackId} t={t} />,
      },
      {
        key: 'title',
        title: t('dashboard.activeReferendums.proposal'),
        render: (_v, row) => <FootnoteText className="line-clamp-2 text-text-primary">{row.title}</FootnoteText>,
      },
      {
        key: 'ourVotes',
        title: t('dashboard.activeReferendums.votes'),
        width: '160px',
        render: (_v, row) => <VoteChipsCell ourVotes={row.ourVotes} t={t} />,
      },
      {
        key: 'timeLeftMs',
        title: t('dashboard.activeReferendums.time'),
        sortable: true,
        width: '80px',
        render: (_v, row) => <TimeLeftCell timeLeftMs={row.timeLeftMs} />,
      },
      {
        key: 'ayePercent',
        title: '',
        width: '144px',
        render: (_v, row) => <AyeNayCell ayePercent={row.ayePercent} t={t} />,
      },
      {
        key: 'tvlNumeric',
        title: t('dashboard.activeReferendums.tvl'),
        sortable: true,
        width: '110px',
        render: (_v, row) => <TvlCell referendum={row} />,
      },
    ],
    [t],
  );

  const endedColumns = useMemo(
    (): Column<EndedReferendum>[] => [
      {
        key: 'chainIcon',
        title: '',
        width: '52px',
        render: (_v, row) => <img src={row.chainIcon} alt={row.chainName} className="h-10 w-10" />,
      },
      {
        key: 'id',
        title: t('dashboard.activeReferendums.id'),
        width: '56px',
        render: (_v, row) => <FootnoteText className="font-mono text-text-tertiary">#{row.id}</FootnoteText>,
      },
      {
        key: 'trackId',
        title: t('dashboard.activeReferendums.track'),
        width: '192px',
        render: (_v, row) => <TrackCell trackId={row.trackId} t={t} />,
      },
      {
        key: 'title',
        title: t('dashboard.activeReferendums.proposal'),
        render: (_v, row) => <FootnoteText className="line-clamp-2 text-text-primary">{row.title}</FootnoteText>,
      },
      {
        key: 'outcome',
        title: t('dashboard.referendums.outcome'),
        width: '100px',
        render: (_v, row) => <OutcomeCell outcome={row.outcome} t={t} />,
      },
      {
        key: 'endedAtMs',
        title: t('dashboard.referendums.ended'),
        sortable: true,
        width: '90px',
        render: (_v, row) => <FootnoteText className="text-text-tertiary">{formatEndDate(row.endedAtMs)}</FootnoteText>,
      },
      {
        key: 'unlockableAmount',
        title: t('dashboard.referendums.unlockable'),
        width: '110px',
        render: (_v, row) => <UnlockableCell referendum={row} />,
      },
      {
        key: 'addressesWithLocks',
        title: t('dashboard.referendums.locks'),
        width: '60px',
        render: (_v, row) => (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-chip-icon px-1.5 text-help-text font-semibold text-white">
            {row.addressesWithLocks}
          </span>
        ),
      },
    ],
    [t],
  );

  const handleActiveRowClick = useCallback((_row: ReferendumRow) => {
    setSelectedActive(_row);
  }, []);

  const handleEndedRowClick = useCallback((_row: EndedReferendum) => {
    setSelectedEnded(_row);
  }, []);

  if (!fiatFlag) return null;

  if (accountIds.length === 0) {
    return (
      <DashboardWidget colSpan={4}>
        <FootnoteText className="text-text-tertiary">{t('dashboard.activeReferendums.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  const pending = tab === 'active' ? activePending : endedPending;
  const isEmpty = tab === 'active' ? activeRefs.length === 0 : endedRefs.length === 0;
  const emptyMessage =
    tab === 'active' ? t('dashboard.activeReferendums.noReferendums') : t('dashboard.referendums.noEndedReferendums');

  return (
    <>
      <DashboardWidget colSpan={4}>
        <div className="flex items-center gap-2">
          <FootnoteText className="text-text-tertiary">{t('dashboard.activeReferendums.title')}</FootnoteText>
        </div>

        {/* Tab bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1">
            <TabButton
              active={tab === 'active'}
              count={activeRefs.length}
              label={t('dashboard.referendums.activeTab')}
              onClick={() => setTab('active')}
            />
            <TabButton
              active={tab === 'ended'}
              count={endedRefs.length}
              label={t('dashboard.referendums.endedTab')}
              onClick={() => setTab('ended')}
            />
          </div>
          {!isEmpty && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-[140px]">
                <Select
                  height="sm"
                  placeholder={t('dashboard.activeReferendums.allChains')}
                  value={chainFilter}
                  onChange={(v) => setChainFilter(v === chainFilter ? null : v)}
                >
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

        {pending && isEmpty && (
          <div className="my-4 flex flex-col gap-3">
            <Skeleton width="100%" height={10} />
            <Skeleton width="100%" height={10} />
            <Skeleton width="100%" height={10} />
          </div>
        )}

        {!pending && isEmpty && (
          <div className="flex flex-col items-center gap-y-1 py-6">
            <BodyText className="text-text-tertiary">{emptyMessage}</BodyText>
          </div>
        )}

        {!isEmpty && ((tab === 'active' && activeRows.length === 0) || (tab === 'ended' && endedRows.length === 0)) && (
          <div className="flex flex-col items-center gap-y-1 py-6">
            <BodyText className="text-text-tertiary">{t('dashboard.activeReferendums.noResults')}</BodyText>
          </div>
        )}

        {tab === 'active' && activeRows.length > 0 && (
          <div className="mt-3 max-h-[400px] overflow-y-auto">
            <Table columns={activeColumns} data={activeRows} onRowClick={handleActiveRowClick} />
          </div>
        )}

        {tab === 'ended' && endedRows.length > 0 && (
          <div className="mt-3 max-h-[400px] overflow-y-auto">
            <Table columns={endedColumns} data={endedRows} onRowClick={handleEndedRowClick} />
          </div>
        )}
      </DashboardWidget>

      {selectedActive && <ReferendumDetailModal referendum={selectedActive} onClose={() => setSelectedActive(null)} />}

      {selectedEnded && (
        <EndedReferendumDetailModal referendum={selectedEnded} onClose={() => setSelectedEnded(null)} />
      )}
    </>
  );
};

const TabButton = ({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={cnTw(
      'flex items-center gap-2 rounded-md px-3 py-1.5 text-footnote font-semibold transition-colors',
      active ? 'bg-selected-background text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
    )}
    onClick={onClick}
  >
    {label}
    <span
      className={cnTw(
        'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-help-text font-semibold',
        active ? 'bg-chip-icon text-white' : 'bg-input-background-disabled text-text-tertiary',
      )}
    >
      {count}
    </span>
  </button>
);

const TrackCell = ({ trackId, t }: { trackId: number; t: ReturnType<typeof useI18n>['t'] }) => {
  const trackInfo = getTrackInfo(trackId);
  const label = t(trackInfo.title);

  return (
    <div className="flex items-center gap-1" title={label}>
      <Icon name={trackInfo.icon} size={14} className="shrink-0 text-text-secondary" />
      <FootnoteText className="truncate text-text-secondary">{label}</FootnoteText>
    </div>
  );
};

const VoteChipsCell = ({
  ourVotes,
  t,
}: {
  ourVotes: ActiveReferendum['ourVotes'];
  t: ReturnType<typeof useI18n>['t'];
}) => {
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
};

const TimeLeftCell = ({ timeLeftMs }: { timeLeftMs: number }) => {
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
};

const AyeNayCell = ({ ayePercent, t }: { ayePercent: number; t: ReturnType<typeof useI18n>['t'] }) => {
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
};

const TvlCell = ({ referendum }: { referendum: ActiveReferendum }) => {
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
};

const OutcomeCell = ({ outcome, t }: { outcome: EndedReferendum['outcome']; t: ReturnType<typeof useI18n>['t'] }) => (
  <span className={cnTw('rounded px-1.5 py-0.5 text-help-text font-medium', OUTCOME_STYLES[outcome])}>
    {t(`dashboard.referendums.${OUTCOME_I18N_KEY[outcome]}`)}
  </span>
);

const UnlockableCell = ({ referendum }: { referendum: EndedReferendum }) => {
  const { formatted: tokenFormatted } = formatBalance(referendum.unlockableAmount, referendum.precision);
  const hasUnlockable = referendum.unlockableAmount !== '0';

  return (
    <div className="text-right">
      <FootnoteText
        className={cnTw('tabular-nums', hasUnlockable ? 'font-semibold text-text-positive' : 'text-text-tertiary')}
      >
        {tokenFormatted} {referendum.symbol}
      </FootnoteText>
      {hasUnlockable && (
        <FootnoteText className="text-help-text text-text-tertiary tabular-nums">
          ${formatFiatBalance(referendum.unlockableAmountFiat).formatted}
        </FootnoteText>
      )}
    </div>
  );
};
