import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type ReactNode, memo, useCallback, useDeferredValue, useMemo, useState } from 'react';

import { ConnectionStatus } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { BodyText, FootnoteText, Icon, SmallTitleText, Switch } from '@/shared/ui';
import { TrackInfo, getTrackMeta } from '@/shared/ui-entities';
import { type Column, Select, Skeleton, Table, Tooltip } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { networkModel } from '@/entities/network';
import { governanceUnlockFlow } from '@/features/governance-unlock-flow';
import { NamedAccount } from '@/widgets/NameResolver';
import { DashboardWidget } from '@/pages/Dashboard';
import { type GovernanceLockRow, useGovernanceLocks } from '../hooks/useGovernanceLocks';

import { LockActionCell } from './LockActionCell';
import { Price } from './Price';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

const ALL_CHAINS = '__all__';

const formatToken = (amount: BN, precision: number, symbol: string) => {
  const { value, suffix } = formatBalance(amount, precision);

  return `${value}${suffix} ${symbol}`;
};

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
        <FootnoteText className={className ?? 'text-text-primary tabular-nums'}>
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
    const { t } = useI18n();

    const releaseLine =
      row.nextUnlockAtMs && row.daysUntilNextUnlock !== null
        ? t('dashboard.governanceLocks.inDays', {
            count: row.daysUntilNextUnlock,
            date: new Date(row.nextUnlockAtMs).toLocaleDateString(),
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

  return (
    <Tooltip open={rest.length > 0 ? undefined : false}>
      <Tooltip.Trigger>
        <div tabIndex={0} className="flex items-center gap-1">
          <TrackInfo trackId={first} />
          {rest.length > 0 && (
            <span className="rounded bg-input-background-disabled px-1.5 py-0.5 text-help-text font-medium text-text-tertiary">
              {t('dashboard.governanceLocks.moreTracks', { count: rest.length })}
            </span>
          )}
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div className="flex flex-col gap-0.5">
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
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon name="info" size={12} className="shrink-0 text-text-tertiary" />
      </span>
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

  const handleChainFilterChange = useCallback((value: string) => {
    setChainFilter(value === ALL_CHAINS ? null : value);
  }, []);

  const handleUnlock = useCallback(
    (row: GovernanceLockRow) => {
      // The row's figures come from a periodic snapshot; re-run the schedule
      // against the live head so a just-ended referendum still gets its
      // `remove_vote` — and so the initiator is the one allowed to send it.
      const fresh = getFreshClaim(row);
      if (!fresh) return;

      unlockRequested({
        chain: row.chain,
        initiator: fresh.initiator,
        target: fresh.target,
        actions: fresh.actions,
        amount: fresh.amount,
      });
    },
    [getFreshClaim, unlockRequested],
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

  const columns = useMemo(
    (): Column<GovernanceLockRow>[] => [
      {
        key: 'accountId',
        title: t('dashboard.governanceLocks.account'),
        width: '180px',
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
        width: '150px',
        render: (_value, row) => (
          <div className="flex items-center gap-1.5">
            <img src={row.chainIcon} alt={row.chainName} className="h-5 w-5" />
            <FootnoteText className="whitespace-nowrap text-text-secondary">{row.chainName}</FootnoteText>
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
        width: '120px',
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
        width: '120px',
        render: (_value, row) => (
          <AmountCell
            amount={row.claimable}
            fiat={row.claimableFiat}
            precision={row.precision}
            symbol={row.symbol}
            currency={currency}
            showFiat={fiatFlag}
            className="font-semibold text-text-positive tabular-nums"
          />
        ),
      },
      {
        key: 'pending',
        title: (
          <HeaderWithHint
            label={t('dashboard.governanceLocks.pending')}
            hint={t('dashboard.governanceLocks.hint.pendingTooltip')}
          />
        ),
        width: '150px',
        render: (_value, row) => <PendingCell row={row} showFiat={fiatFlag} currency={currency} />,
      },
      {
        key: 'delegated',
        title: (
          <HeaderWithHint
            label={t('dashboard.governanceLocks.delegated')}
            hint={t('dashboard.governanceLocks.hint.delegatedTooltip')}
          />
        ),
        width: '110px',
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
      },
      {
        key: 'tracks',
        title: t('dashboard.governanceLocks.tracks'),
        width: '160px',
        render: (_value, row) => <TracksCell tracks={row.tracks} />,
      },
      {
        key: 'claimableActions',
        title: t('dashboard.governanceLocks.action'),
        width: '170px',
        render: (_value, row) => (
          <LockActionCell
            row={row}
            chainConnected={connectionStatuses[row.chainId] === ConnectionStatus.CONNECTED}
            onUnlock={handleUnlock}
          />
        ),
      },
    ],
    [t, currency, fiatFlag, connectionStatuses, handleUnlock],
  );

  if (accountIds.length === 0) {
    return (
      <DashboardWidget>
        <FootnoteText className="text-text-tertiary">{t('dashboard.governanceLocks.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  return (
    <DashboardWidget>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 gap-y-2">
          <FootnoteText className="text-text-tertiary">{t('dashboard.governanceLocks.title')}</FootnoteText>
          {rows.length > 0 && (
            <FootnoteText className="text-text-tertiary">
              {t('dashboard.governanceLocks.rowsCount', { count: visibleRows.length })}
            </FootnoteText>
          )}
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
                        <img src={chain.chainIcon} alt={chain.chainName} className="h-5 w-5" />
                        <span>{chain.chainName}</span>
                      </div>
                    </Select.Item>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>

        {pending && rows.length === 0 && (
          <div className="my-4 flex flex-col gap-3">
            <Skeleton width="100%" height={10} />
            <Skeleton width="100%" height={10} />
            <Skeleton width="100%" height={10} />
          </div>
        )}

        {!pending && rows.length === 0 && (
          <div className="flex flex-col items-center gap-y-1 py-6">
            <BodyText className="text-text-tertiary">{t('dashboard.governanceLocks.noLocks')}</BodyText>
          </div>
        )}

        {rows.length > 0 && visibleRows.length === 0 && (
          <div className="flex flex-col items-center gap-y-1 py-6">
            <BodyText className="text-text-tertiary">{t('dashboard.governanceLocks.noResults')}</BodyText>
          </div>
        )}

        {visibleRows.length > 0 && (
          <div className="mt-3 min-h-0 flex-1 overflow-auto">
            <div className="min-w-[1160px]">
              <Table columns={columns} data={visibleRows} getRowKey={(row) => row.key} stickyHeader />
            </div>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
};
