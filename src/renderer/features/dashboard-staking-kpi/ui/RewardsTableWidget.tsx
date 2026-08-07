import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { BodyText, FootnoteText, HelpText, SmallTitleText } from '@/shared/ui';
import { type DataTableColumn, type DataTableFilterState, DataTable, Tooltip } from '@/shared/ui-kit';
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
  const { rows, days, ready } = useAccountRewardRows(accountIds, rewardWindow);

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
      text: (row) => {
        const formatted = formatBalance(pick(row), row.precision);

        return `${formatted.formatted}${formatted.suffix} ${row.symbol}`;
      },
      exportValue: (row) => formatBalance(pick(row), row.precision, { keepPrecision: true }).formatted,
      value: (row) => Number(formatBalance(pick(row), row.precision, { keepPrecision: true }).value),
      render: (row) => {
        const formatted = formatBalance(pick(row), row.precision);

        return (
          <FootnoteText className="tabular-nums">
            {formatted.formatted}
            {formatted.suffix} {row.symbol}
          </FootnoteText>
        );
      },
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
        render: (row) => (
          <NamedAccount
            accountId={pjsSchema.helpers.toAccountId(row.accountId)}
            chain={undefined}
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

      {ready && days !== null ? (
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
