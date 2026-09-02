import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type ReactNode, memo, useMemo } from 'react';

import { ConnectionStatus } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { TrackInfo, getTrackMeta } from '@/shared/ui-entities';
import { type Column, Table, Tooltip } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { networkModel } from '@/entities/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { type LocksTableState } from '../hooks/useLocksTable';
import { type GovernanceLockRow } from '../lib/buildLockRows';
import { formatToken } from '../lib/formatToken';

import { ESTIMATE_DATE_FORMAT, LockActionCell } from './LockActionCell';
import { Price } from './Price';
import { TableSkeleton } from './TableSkeleton';
import { WidgetEmptyState } from './WidgetEmptyState';

export type LocksTableMode = 'compact' | 'full';

type Props = {
  mode: LocksTableMode;
  state: LocksTableState;
  /**
   * The rows to draw — `state.rows` in the card, `state.visibleRows` in the
   * modal.
   */
  rows: GovernanceLockRow[];
};

/**
 * Fixed column widths, px. The table never squeezes below their sum — it
 * scrolls sideways instead, with the Action column pinned so the one control in
 * the widget never leaves the screen.
 */
const COLUMN_WIDTH = {
  account: 200,
  chain: 130,
  locked: 130,
  lockedCompact: 150,
  claimable: 130,
  pending: 150,
  delegated: 110,
  tracks: 170,
  action: 170,
} as const;

const FULL_SKELETON_COLUMNS = ['90px', '90px', '90px', '110px', '120px', '80px'];
const COMPACT_SKELETON_COLUMNS = ['110px', '120px'];

/** Tracks listed in the tooltip before it starts scrolling. */
const TRACKS_TOOLTIP_MAX_HEIGHT_CLASS = 'max-h-60';

type AmountCellProps = {
  amount: BN;
  fiat: string | null;
  precision: number;
  symbol: string;
  currency: CurrencyItem | null;
  showFiat: boolean;
  className?: string;
  children?: ReactNode;
};

const AmountCell = memo(
  ({ amount, fiat, precision, symbol, currency, showFiat, className, children }: AmountCellProps) => {
    if (amount.isZero()) {
      return (
        <div className="text-right">
          <FootnoteText className="text-text-tertiary">&mdash;</FootnoteText>
        </div>
      );
    }

    return (
      <div className="text-right">
        <FootnoteText className={className ?? 'whitespace-nowrap text-text-primary tabular-nums'}>
          {formatToken(amount, precision, symbol)}
        </FootnoteText>
        {showFiat && fiat && currency && (
          <FootnoteText className="text-help-text text-text-tertiary tabular-nums">
            <Price amount={fiat} currency={currency} />
          </FootnoteText>
        )}
        {children}
      </div>
    );
  },
);

/** "~in 3 days · Sep 5, 2026", or that no date is known. */
const useReleaseLine = (row: GovernanceLockRow) => {
  const { t, formatDate } = useI18n();

  return row.nextUnlockAtMs && row.daysUntilNextUnlock !== null
    ? t('dashboard.governanceLocks.inDays', {
        count: row.daysUntilNextUnlock,
        date: formatDate(row.nextUnlockAtMs, ESTIMATE_DATE_FORMAT),
      })
    : t('dashboard.governanceLocks.dateUnavailable');
};

const PendingCell = memo(
  ({ row, showFiat, currency }: { row: GovernanceLockRow; showFiat: boolean; currency: CurrencyItem | null }) => {
    const releaseLine = useReleaseLine(row);

    return (
      <AmountCell
        amount={row.pending}
        fiat={row.pendingFiat}
        precision={row.precision}
        symbol={row.symbol}
        currency={currency}
        showFiat={showFiat}
      >
        <FootnoteText className="text-help-text whitespace-nowrap text-text-tertiary">{releaseLine}</FootnoteText>
      </AmountCell>
    );
  },
);

/**
 * The half-width card has room for one amount per row: the lock, with what
 * matters most about it underneath — how much is claimable, or when the next
 * part releases.
 */
const LockedCompactCell = memo(
  ({ row, showFiat, currency }: { row: GovernanceLockRow; showFiat: boolean; currency: CurrencyItem | null }) => {
    const { t } = useI18n();
    const releaseLine = useReleaseLine(row);

    const caption = !row.claimable.isZero()
      ? {
          text: t('dashboard.unlockSchedule.claimableCaption', {
            amount: formatToken(row.claimable, row.precision, row.symbol),
          }),
          className: 'text-help-text whitespace-nowrap text-text-positive',
        }
      : !row.pending.isZero()
        ? { text: releaseLine, className: 'text-help-text whitespace-nowrap text-text-tertiary' }
        : null;

    return (
      <div className="text-right">
        <FootnoteText className="whitespace-nowrap text-text-primary tabular-nums">
          {formatToken(row.locked, row.precision, row.symbol)}
        </FootnoteText>
        {showFiat && row.lockedFiat && currency && (
          <FootnoteText className="text-help-text text-text-tertiary tabular-nums">
            <Price amount={row.lockedFiat} currency={currency} />
          </FootnoteText>
        )}
        {caption && <FootnoteText className={caption.className}>{caption.text}</FootnoteText>}
      </div>
    );
  },
);

const TracksCell = memo(({ tracks }: { tracks: string[] }) => {
  const { t } = useI18n();

  const [first, ...rest] = tracks;

  if (!first) {
    return <FootnoteText className="text-text-tertiary">&mdash;</FootnoteText>;
  }

  if (rest.length === 0) {
    return <TrackInfo trackId={first} />;
  }

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <button
          type="button"
          className="flex cursor-default items-center gap-1"
          aria-label={t('dashboard.governanceLocks.tracksCount', { count: tracks.length })}
        >
          <TrackInfo trackId={first} />
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-chip-icon px-1.5 text-help-text font-semibold text-white">
            {t('dashboard.governanceLocks.moreTracks', { count: rest.length })}
          </span>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div className={`flex flex-col gap-0.5 overflow-y-auto ${TRACKS_TOOLTIP_MAX_HEIGHT_CLASS}`}>
          <span className="mb-1 font-semibold">
            {t('dashboard.governanceLocks.tracksCount', { count: tracks.length })}
          </span>
          {tracks.map((track) => (
            <span key={track}>{t(getTrackMeta(track).title)}</span>
          ))}
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
});

const HeaderWithHint = memo(({ label, hint }: { label: string; hint: string }) => (
  <Tooltip>
    <Tooltip.Trigger>
      <button type="button" className="inline-flex cursor-default items-center gap-1" aria-label={`${label}. ${hint}`}>
        {label}
        <span aria-hidden="true" className="flex">
          <Icon name="info" size={12} className="shrink-0 text-text-tertiary" />
        </span>
      </button>
    </Tooltip.Trigger>
    <Tooltip.Content>{hint}</Tooltip.Content>
  </Tooltip>
));

const AccountCell = memo(({ row, withChainIcon }: { row: GovernanceLockRow; withChainIcon: boolean }) => (
  <div className="flex min-w-0 items-center gap-1.5">
    <div className="min-w-0 flex-1">
      <NamedAccount
        accountId={row.accountId}
        chain={row.chain}
        wallet={row.wallet}
        walletNameAs="fallback"
        variant="short"
      />
    </div>
    {withChainIcon && (
      <img
        src={row.chainIcon}
        alt={row.chainName}
        title={row.chainName}
        width={16}
        height={16}
        className="h-4 w-4 shrink-0"
      />
    )}
  </div>
));

/**
 * The lock rows and the states around them. `compact` is the three-column card
 * (Account · Locked · Action); `full` is the whole table the modal shows, with
 * Pending and Delegated appearing only while some row fills them.
 */
export const LocksTable = ({ mode, state, rows }: Props) => {
  const { t } = useI18n();
  const connectionStatuses = useUnit(networkModel.$connectionStatuses);
  const { currency, fiatFlag, onUnlock, pending } = state;

  // A column that is "—" on every row says nothing and costs the width the
  // other columns need; it comes back the moment one row fills it.
  const showPending = useMemo(() => mode === 'full' && rows.some((row) => !row.pending.isZero()), [mode, rows]);
  const showDelegated = useMemo(() => mode === 'full' && rows.some((row) => !row.delegated.isZero()), [mode, rows]);

  const columns = useMemo((): Column<GovernanceLockRow>[] => {
    const account: Column<GovernanceLockRow> = {
      key: 'accountId',
      title: t('dashboard.governanceLocks.account'),
      width: `${COLUMN_WIDTH.account}px`,
      render: (_value, row) => <AccountCell row={row} withChainIcon={mode === 'compact'} />,
    };
    const action: Column<GovernanceLockRow> = {
      key: 'claimableActions',
      title: t('dashboard.governanceLocks.action'),
      width: `${COLUMN_WIDTH.action}px`,
      pin: 'right',
      render: (_value, row) => (
        <LockActionCell
          row={row}
          chainConnected={connectionStatuses[row.chainId] === ConnectionStatus.CONNECTED}
          onUnlock={onUnlock}
        />
      ),
    };

    if (mode === 'compact') {
      return [
        account,
        {
          key: 'lockedNum',
          title: t('dashboard.governanceLocks.locked'),
          width: `${COLUMN_WIDTH.lockedCompact}px`,
          render: (_value, row) => <LockedCompactCell row={row} showFiat={fiatFlag} currency={currency} />,
        },
        action,
      ];
    }

    const all: (Column<GovernanceLockRow> | null)[] = [
      account,
      {
        key: 'chainName',
        title: t('dashboard.governanceLocks.chain'),
        width: `${COLUMN_WIDTH.chain}px`,
        render: (_value, row) => (
          <div className="flex items-center gap-1.5">
            <img src={row.chainIcon} alt="" width={20} height={20} className="h-5 w-5" />
            <span className="min-w-0 truncate" title={row.chainName}>
              <FootnoteText className="text-text-secondary">{row.chainName}</FootnoteText>
            </span>
          </div>
        ),
      },
      {
        key: 'lockedNum',
        title: (
          <HeaderWithHint
            label={t('dashboard.governanceLocks.locked')}
            hint={t('dashboard.governanceLocks.hint.lockedTooltip')}
          />
        ),
        sortable: true,
        width: `${COLUMN_WIDTH.locked}px`,
        render: (_value, row) => (
          <AmountCell
            amount={row.locked}
            fiat={row.lockedFiat}
            precision={row.precision}
            symbol={row.symbol}
            currency={currency}
            showFiat={fiatFlag}
          />
        ),
      },
      {
        key: 'claimableNum',
        title: (
          <HeaderWithHint
            label={t('dashboard.governanceLocks.claimable')}
            hint={t('dashboard.governanceLocks.hint.claimableTooltip')}
          />
        ),
        sortable: true,
        width: `${COLUMN_WIDTH.claimable}px`,
        render: (_value, row) => (
          <AmountCell
            amount={row.claimable}
            fiat={row.claimableFiat}
            precision={row.precision}
            symbol={row.symbol}
            currency={currency}
            showFiat={fiatFlag}
            className="font-semibold whitespace-nowrap text-text-positive tabular-nums"
          />
        ),
      },
      showPending
        ? {
            key: 'pending',
            title: (
              <HeaderWithHint
                label={t('dashboard.governanceLocks.pending')}
                hint={t('dashboard.governanceLocks.hint.pendingTooltip')}
              />
            ),
            width: `${COLUMN_WIDTH.pending}px`,
            render: (_value, row) => <PendingCell row={row} showFiat={fiatFlag} currency={currency} />,
          }
        : null,
      showDelegated
        ? {
            key: 'delegated',
            title: (
              <HeaderWithHint
                label={t('dashboard.governanceLocks.delegated')}
                hint={t('dashboard.governanceLocks.hint.delegatedTooltip')}
              />
            ),
            width: `${COLUMN_WIDTH.delegated}px`,
            render: (_value, row) => (
              <AmountCell
                amount={row.delegated}
                fiat={row.delegatedFiat}
                precision={row.precision}
                symbol={row.symbol}
                currency={currency}
                showFiat={fiatFlag}
              />
            ),
          }
        : null,
      {
        key: 'tracks',
        title: t('dashboard.governanceLocks.tracks'),
        width: `${COLUMN_WIDTH.tracks}px`,
        render: (_value, row) => <TracksCell tracks={row.tracks} />,
      },
      action,
    ];

    return all.filter((column): column is Column<GovernanceLockRow> => column !== null);
  }, [mode, t, currency, fiatFlag, connectionStatuses, onUnlock, showPending, showDelegated]);

  // The table's floor: below the sum of its columns it scrolls sideways rather
  // than crushing the amounts into wrapped digits.
  const minTableWidth = useMemo(
    () =>
      mode === 'compact'
        ? COLUMN_WIDTH.account + COLUMN_WIDTH.lockedCompact + COLUMN_WIDTH.action
        : COLUMN_WIDTH.account +
          COLUMN_WIDTH.chain +
          COLUMN_WIDTH.locked +
          COLUMN_WIDTH.claimable +
          (showPending ? COLUMN_WIDTH.pending : 0) +
          (showDelegated ? COLUMN_WIDTH.delegated : 0) +
          COLUMN_WIDTH.tracks +
          COLUMN_WIDTH.action,
    [mode, showPending, showDelegated],
  );

  if (pending && state.rows.length === 0) {
    return <TableSkeleton columns={mode === 'compact' ? COMPACT_SKELETON_COLUMNS : FULL_SKELETON_COLUMNS} />;
  }

  if (state.rows.length === 0) {
    return (
      <WidgetEmptyState
        title={t('dashboard.governanceLocks.noLocks')}
        description={t('dashboard.governanceLocks.noLocksDescription')}
      />
    );
  }

  if (rows.length === 0) {
    return <WidgetEmptyState description={t('dashboard.governanceLocks.noResults')} />;
  }

  return (
    <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain">
      <div style={{ minWidth: minTableWidth }}>
        <Table columns={columns} data={rows} getRowKey={(row) => row.key} stickyHeader />
      </div>
    </div>
  );
};
