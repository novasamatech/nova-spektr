import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance, formatBalanceExact } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { BodyText, FootnoteText, HelpText, SmallTitleText } from '@/shared/ui';
import { type DataTableColumn, type DataTableFilterState, DataTable, Tooltip } from '@/shared/ui-kit';
import { comparePlanck } from '@/features/dashboard-staking-positions';
import { NamedAccount } from '@/widgets/NameResolver';
import { DashboardWidget } from '@/pages/Dashboard';
import { type AccountRewardRow, useAccountRewardRows } from '../hooks/useAccountRewardRows';
import { type RewardWindow, DEFAULT_REWARD_WINDOW, windowSlug } from '../lib/reward-period';

import { PeriodTabs } from './PeriodTabs';

type Props = {
  accountIds: string[];
};

const MIN_WIDTH = 1180;

/**
 * Rewards seen from the **account**, over a window the user picks.
 *
 * The claim drill-down is organised by validator, because that is the unit a
 * payout call takes. This is the other question — "which of my addresses earned
 * what, and what is that worth annualised" — and it is a different table rather
 * than a mode of the same one: mixing the two would put a Claim button on a row
 * that cannot express one call.
 */
export const RewardsTableWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const [rewardWindow, setRewardWindow] = useState<RewardWindow>(DEFAULT_REWARD_WINDOW);
  const { rows, days, ready, covered } = useAccountRewardRows(accountIds, rewardWindow);

  const columns = useMemo<DataTableColumn<AccountRewardRow>[]>(() => {
    const amount = (
      id: string,
      width: string,
      pick: (row: AccountRewardRow) => string,
    ): DataTableColumn<AccountRewardRow> => ({
      id,
      title: t(`dashboard.staking.rewardsTable.columns.${id}`),
      width,
      sortable: true,
      filter: 'range',
      // `formatted` already carries the shorthand suffix; appending `suffix`
      // again printed `2MM DOT`. Sorting, the range filter and the export read
      // the un-abbreviated amount instead — a `value` divided by its own
      // shorthand makes 2M DOT compare as smaller than 900K.
      text: (row) => `${formatBalance(pick(row), row.precision).formatted} ${row.symbol}`,
      exportValue: (row) => formatBalanceExact(pick(row), row.precision),
      value: (row) => Number(formatBalanceExact(pick(row), row.precision)),
      // Planck amounts run past `Number.MAX_SAFE_INTEGER`, so the order is
      // settled on the raw integers rather than on `value`.
      compare: (a, b) => comparePlanck(pick(a), pick(b)),
      render: (row) => (
        <FootnoteText className="tabular-nums">
          {formatBalance(pick(row), row.precision).formatted} {row.symbol}
        </FootnoteText>
      ),
    });

    return [
      {
        id: 'network',
        title: t('dashboard.staking.rewardsTable.columns.network'),
        width: '10%',
        sortable: true,
        filter: 'enum',
        text: (row) => row.networkName,
        render: (row) => <FootnoteText className="truncate">{row.networkName}</FootnoteText>,
      },
      {
        id: 'chain',
        title: t('dashboard.staking.rewardsTable.columns.chain'),
        width: '12%',
        sortable: true,
        filter: 'enum',
        text: (row) => row.chainName,
        render: (row) => <FootnoteText className="truncate text-text-secondary">{row.chainName}</FootnoteText>,
      },
      {
        id: 'account',
        title: t('dashboard.staking.rewardsTable.columns.account'),
        width: '18%',
        // The chain and the wallet are what make the resolver run the full
        // chain (custom name → contact → identity → wallet name); without them
        // the cell prints a generic-prefix address next to the chain-prefixed
        // one in the Address column.
        render: (row) => (
          <NamedAccount
            accountId={pjsSchema.helpers.toAccountId(row.accountId)}
            chain={row.chain}
            wallet={row.wallet ?? undefined}
            variant="short"
            iconSize={20}
            hideExplorers
          />
        ),
      },
      {
        id: 'address',
        title: t('dashboard.staking.rewardsTable.columns.address'),
        width: '11%',
        filter: 'text',
        text: (row) => row.address,
        render: (row) => <HelpText className="truncate text-text-tertiary">{row.address}</HelpText>,
      },
      {
        id: 'role',
        title: t('dashboard.staking.rewardsTable.columns.role'),
        width: '9%',
        sortable: true,
        filter: 'enum',
        text: (row) => t(`dashboard.staking.positions.role.${row.role}`),
        render: (row) => (
          <FootnoteText className="text-text-secondary">
            {t(`dashboard.staking.positions.role.${row.role}`)}
          </FootnoteText>
        ),
      },
      amount('totalStaked', '13%', (row) => row.totalStaked),
      amount('rewards', '13%', (row) => row.rewards),
      {
        id: 'apy',
        title: t('dashboard.staking.rewardsTable.columns.apy'),
        width: '14%',
        sortable: true,
        filter: 'range',
        text: (row) => (row.apy === null ? t('dashboard.staking.positions.noValue') : `${row.apy.toFixed(2)}%`),
        value: (row) => row.apy,
        render: (row) => (
          <div className="flex flex-col">
            {row.apy === null ? (
              <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
            ) : (
              <Tooltip>
                <Tooltip.Trigger>
                  <FootnoteText className="text-text-positive tabular-nums">{row.apy.toFixed(2)}%</FootnoteText>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('dashboard.staking.rewardsTable.apyHint')}</Tooltip.Content>
              </Tooltip>
            )}

            {row.networkApy === null ? null : (
              <HelpText className="text-text-tertiary tabular-nums">
                {t('dashboard.staking.rewardsTable.networkAverage', { value: row.networkApy.toFixed(2) })}
              </HelpText>
            )}
          </div>
        ),
      },
    ];
  }, [t]);

  return (
    <DashboardWidget>
      <div className="mb-3 flex items-center justify-between gap-x-4">
        <SmallTitleText>{t('dashboard.staking.rewardsTable.title')}</SmallTitleText>
        <PeriodTabs value={rewardWindow} onChange={setRewardWindow} />
      </div>

      {accountIds.length === 0 ? (
        <BodyText className="text-text-tertiary">{t('dashboard.staking.rewardsTable.noSelection')}</BodyText>
      ) : ready ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          minWidth={MIN_WIDTH}
          searchPlaceholder={t('dashboard.staking.rewardsTable.searchPlaceholder')}
          emptyMessage={t('dashboard.staking.rewardsTable.empty')}
          exportFileName={(context: { filters: DataTableFilterState }) => exportName(context, rewardWindow)}
        />
      ) : (
        // A half-picked range would annualise over a length nobody chose.
        <BodyText className="text-text-tertiary">{t('dashboard.staking.rewardsTable.pickRange')}</BodyText>
      )}

      {ready && !covered ? (
        // Rows still list what is staked; the earnings column simply has no
        // data to report over a range older than the fetched history.
        <HelpText className="mt-2 text-text-tertiary">{t('dashboard.staking.rewardsTable.outOfHistory')}</HelpText>
      ) : ready && days !== null ? (
        <HelpText className="mt-2 text-text-tertiary">
          {t('dashboard.staking.rewardsTable.windowHint', { days })}
        </HelpText>
      ) : null}
    </DashboardWidget>
  );
};

const exportName = (context: { filters: DataTableFilterState }, rewardWindow: RewardWindow): string => {
  const parts = (context.filters.enum['network'] ?? []).map((part) => part.toLowerCase().replaceAll(/\s+/g, '-'));

  return `nova-spektr-staking-account-rewards-${[...parts, windowSlug(rewardWindow)].join('-')}.csv`;
};
