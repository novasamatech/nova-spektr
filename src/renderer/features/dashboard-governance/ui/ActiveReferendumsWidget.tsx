import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance, formatFiatBalance } from '@/shared/lib/utils';
import { type IconNames, BodyText, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { VoteChart } from '@/shared/ui-entities';
import { type Column, Skeleton, Table, Tooltip } from '@/shared/ui-kit';
import { DashboardWidget } from '@/pages/Dashboard';
import { type ActiveReferendum, useActiveReferendums } from '../hooks/useActiveReferendums';

import { ReferendumDetailModal } from './ReferendumDetailModal';

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

type ReferendumRow = ActiveReferendum & {
  tvlNumeric: number;
};

export const ActiveReferendumsWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const { referendums, pending, fiatFlag } = useActiveReferendums(accountIds, allEntries);
  const [selectedReferendum, setSelectedReferendum] = useState<ActiveReferendum | null>(null);

  const rows = useMemo(
    (): ReferendumRow[] =>
      referendums.map((ref) => ({
        ...ref,
        tvlNumeric: parseFloat(ref.totalLockedFiat),
      })),
    [referendums],
  );

  const columns = useMemo(
    (): Column<ReferendumRow>[] => [
      {
        key: 'chainIcon',
        title: '',
        width: '52px',
        render: (_v, row) => <img src={row.chainIcon} alt={row.chainName} className="h-10 w-10" />,
      },
      {
        key: 'id',
        title: '',
        width: '56px',
        render: (_v, row) => <FootnoteText className="font-mono text-text-tertiary">#{row.id}</FootnoteText>,
      },
      {
        key: 'trackId',
        title: '',
        width: '192px',
        render: (_v, row) => <TrackCell trackId={row.trackId} t={t} />,
      },
      {
        key: 'title',
        title: '',
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

  const handleRowClick = useCallback((_row: ReferendumRow) => {
    setSelectedReferendum(_row);
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

  return (
    <>
      <DashboardWidget colSpan={4}>
        <div className="flex items-center gap-2">
          <FootnoteText className="text-text-tertiary">{t('dashboard.activeReferendums.title')}</FootnoteText>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-chip-icon px-1.5 text-help-text font-semibold text-white">
            {referendums.length}
          </span>
        </div>

        {pending && referendums.length === 0 && (
          <div className="my-4 flex flex-col gap-3">
            <Skeleton width="100%" height={10} />
            <Skeleton width="100%" height={10} />
            <Skeleton width="100%" height={10} />
          </div>
        )}

        {!pending && referendums.length === 0 && (
          <div className="flex flex-col items-center gap-y-1 py-6">
            <BodyText className="text-text-tertiary">{t('dashboard.activeReferendums.noReferendums')}</BodyText>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-3 max-h-[400px] overflow-y-auto">
            <Table columns={columns} data={rows} onRowClick={handleRowClick} />
          </div>
        )}
      </DashboardWidget>

      {selectedReferendum && (
        <ReferendumDetailModal referendum={selectedReferendum} onClose={() => setSelectedReferendum(null)} />
      )}
    </>
  );
};

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
