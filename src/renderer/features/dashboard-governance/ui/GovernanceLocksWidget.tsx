import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type ReactNode, memo, useCallback, useDeferredValue, useMemo, useState } from 'react';

import { ConnectionStatus } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon, Switch } from '@/shared/ui';
import { TrackInfo, getTrackMeta } from '@/shared/ui-entities';
import { type Column, Select, Table, Tooltip, useNotification } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { networkModel } from '@/entities/network';
import { governanceUnlockFlow } from '@/features/governance-unlock-flow';
import { NamedAccount } from '@/widgets/NameResolver';
import { DashboardWidget } from '@/pages/Dashboard';
import { type GovernanceLockRow, useGovernanceLocks } from '../hooks/useGovernanceLocks';
import { formatToken } from '../lib/formatToken';

import { BLOCK_REASON_HINT, ESTIMATE_DATE_FORMAT, LockActionCell } from './LockActionCell';
import { Price } from './Price';
import { TableSkeleton } from './TableSkeleton';
import { WidgetEmptyState } from './WidgetEmptyState';

type Props = {
  accountIds: string[];
};

const ALL_CHAINS = '__all__';

/**
 * Fixed column widths, px. The table never squeezes below their sum — it
 * scrolls sideways instead, with the Action column pinned so the one control in
 * the widget never leaves the screen.
 */
const COLUMN_WIDTH = {
  account: 200,
  chain: 130,
  locked: 130,
  claimable: 130,
  pending: 150,
  delegated: 110,
  tracks: 170,
  action: 170,
} as const;

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

const PendingCell = memo(
  ({ row, showFiat, currency }: { row: GovernanceLockRow; showFiat: boolean; currency: CurrencyItem | null }) => {
    const { t, formatDate } = useI18n();

    const releaseLine =
      row.nextUnlockAtMs && row.daysUntilNextUnlock !== null
        ? t('dashboard.governanceLocks.inDays', {
            count: row.daysUntilNextUnlock,
            date: formatDate(row.nextUnlockAtMs, ESTIMATE_DATE_FORMAT),
          })
        : t('dashboard.governanceLocks.dateUnavailable');

    return (
      <AmountCell
        amount={row.pending}
        fiat={null}
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

/**
 * Plain function component on purpose: the slot render system calls it directly
 * as a function, so it must never be wrapped in `memo`/`lazy`/`forwardRef`.
 */
export const GovernanceLocksWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const deferredAccountIds = useDeferredValue(accountIds);
  const [chainFilter, setChainFilter] = useState<string | null>(null);
  const [claimableOnly, setClaimableOnly] = useState(false);

  const { rows, pending, fiatFlag, currency, getFreshClaim } = useGovernanceLocks(deferredAccountIds);
  const connectionStatuses = useUnit(networkModel.$connectionStatuses);
  const unlockRequested = useUnit(governanceUnlockFlow.unlockRequested);
  const { toast } = useNotification();

  const handleChainFilterChange = useCallback((value: string) => {
    setChainFilter(value === ALL_CHAINS ? null : value);
  }, []);

  const handleUnlock = useCallback(
    (row: GovernanceLockRow) => {
      // The row's figures come from a periodic snapshot; re-run the schedule
      // against the live head so a just-ended referendum still gets its
      // `remove_vote` — and so the initiator is the one allowed to send it.
      const fresh = getFreshClaim(row);

      // The button promised a release the live head no longer backs: say so
      // rather than swallowing the click — the row catches up on the next snapshot.
      if (fresh.status === 'blocked') {
        toast.info(
          fresh.reason === 'nothing-claimable'
            ? t('dashboard.governanceLocks.toast.nothingClaimable')
            : t(BLOCK_REASON_HINT[fresh.reason]),
        );

        return;
      }

      unlockRequested({
        chain: row.chain,
        initiator: fresh.initiator,
        target: fresh.target,
        actions: fresh.actions,
        amount: fresh.amount,
      });
    },
    [getFreshClaim, unlockRequested, toast, t],
  );

  const uniqueChains = useMemo(() => {
    const seen = new Map<string, { chainId: string; chainName: string; chainIcon: string }>();
    for (const row of rows) {
      if (!seen.has(row.chainId)) {
        seen.set(row.chainId, { chainId: row.chainId, chainName: row.chainName, chainIcon: row.chainIcon });
      }
    }

    return [...seen.values()];
  }, [rows]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (chainFilter && row.chainId !== chainFilter) return false;
      if (claimableOnly && row.claimable.isZero()) return false;

      return true;
    });
  }, [rows, chainFilter, claimableOnly]);

  // A column that is "—" on every row says nothing and costs the width the
  // Proposal-like columns need; it comes back the moment one row fills it.
  const showPending = useMemo(() => visibleRows.some((row) => !row.pending.isZero()), [visibleRows]);
  const showDelegated = useMemo(() => visibleRows.some((row) => !row.delegated.isZero()), [visibleRows]);

  const columns = useMemo((): Column<GovernanceLockRow>[] => {
    const all: (Column<GovernanceLockRow> | null)[] = [
      {
        key: 'accountId',
        title: t('dashboard.governanceLocks.account'),
        width: `${COLUMN_WIDTH.account}px`,
        render: (_value, row) => (
          <NamedAccount
            accountId={row.accountId}
            chain={row.chain}
            wallet={row.wallet}
            walletNameAs="fallback"
            variant="short"
          />
        ),
      },
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
      {
        key: 'claimableActions',
        title: t('dashboard.governanceLocks.action'),
        width: `${COLUMN_WIDTH.action}px`,
        pin: 'right',
        render: (_value, row) => (
          <LockActionCell
            row={row}
            chainConnected={connectionStatuses[row.chainId] === ConnectionStatus.CONNECTED}
            onUnlock={handleUnlock}
          />
        ),
      },
    ];

    return all.filter((column): column is Column<GovernanceLockRow> => column !== null);
  }, [t, currency, fiatFlag, connectionStatuses, handleUnlock, showPending, showDelegated]);

  // The table's floor: below the sum of its columns it scrolls sideways rather
  // than crushing the amounts into wrapped digits.
  const minTableWidth = useMemo(
    () =>
      COLUMN_WIDTH.account +
      COLUMN_WIDTH.chain +
      COLUMN_WIDTH.locked +
      COLUMN_WIDTH.claimable +
      (showPending ? COLUMN_WIDTH.pending : 0) +
      (showDelegated ? COLUMN_WIDTH.delegated : 0) +
      COLUMN_WIDTH.tracks +
      COLUMN_WIDTH.action,
    [showPending, showDelegated],
  );

  if (accountIds.length === 0) {
    return (
      <DashboardWidget>
        <div className="flex h-full min-h-0 flex-col">
          <FootnoteText className="text-text-tertiary">{t('dashboard.governanceLocks.title')}</FootnoteText>
          <WidgetEmptyState
            title={t('dashboard.noSelection.title')}
            description={t('dashboard.noSelection.governanceDescription')}
          />
        </div>
      </DashboardWidget>
    );
  }

  return (
    <DashboardWidget>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 gap-y-2">
          <FootnoteText className="text-text-tertiary">
            {t('dashboard.governanceLocks.title')}
            {rows.length > 0 && (
              <span className="text-text-tertiary">
                {' · '}
                {t('dashboard.governanceLocks.rowsCount', { count: visibleRows.length })}
              </span>
            )}
          </FootnoteText>
          {rows.length > 0 && (
            <div className="ml-auto flex items-center gap-3">
              <Switch checked={claimableOnly} onChange={setClaimableOnly}>
                {t('dashboard.governanceLocks.claimableOnly')}
              </Switch>
              <div className="w-[150px]">
                <Select
                  height="sm"
                  placeholder={t('dashboard.governanceLocks.allChains')}
                  value={chainFilter}
                  onChange={handleChainFilterChange}
                >
                  <Select.Item value={ALL_CHAINS}>
                    <span>{t('dashboard.governanceLocks.allChains')}</span>
                  </Select.Item>
                  {uniqueChains.map((chain) => (
                    <Select.Item key={chain.chainId} value={chain.chainId}>
                      <div className="flex items-center gap-1.5">
                        <img src={chain.chainIcon} alt="" width={20} height={20} className="h-5 w-5" />
                        <span>{chain.chainName}</span>
                      </div>
                    </Select.Item>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>

        {pending && rows.length === 0 && <TableSkeleton columns={['90px', '90px', '90px', '110px', '120px', '80px']} />}

        {!pending && rows.length === 0 && (
          <WidgetEmptyState
            title={t('dashboard.governanceLocks.noLocks')}
            description={t('dashboard.governanceLocks.noLocksDescription')}
          />
        )}

        {rows.length > 0 && visibleRows.length === 0 && (
          <WidgetEmptyState description={t('dashboard.governanceLocks.noResults')} />
        )}

        {visibleRows.length > 0 && (
          <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain">
            <div style={{ minWidth: minTableWidth }}>
              <Table columns={columns} data={visibleRows} getRowKey={(row) => row.key} stickyHeader />
            </div>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
};
