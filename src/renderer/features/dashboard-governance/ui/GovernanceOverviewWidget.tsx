import { memo, useCallback, useDeferredValue, useState } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { BodyText, FootnoteText, SmallTitleText, TitleText } from '@/shared/ui';
import { getColorByPriceId } from '@/shared/ui/chart-constants';
import { Skeleton } from '@/shared/ui-kit';
import { DashboardWidget } from '@/pages/Dashboard';
import { type ChainGovernanceSummary, useGovernanceOverview } from '../hooks/useGovernanceOverview';

import { ChartTooltip } from './ChartTooltip';
import { GovernanceDetailModal } from './GovernanceDetailModal';
import { Price } from './Price';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

export const GovernanceOverviewWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const deferredAccountIds = useDeferredValue(accountIds);
  const { chains, votingMapByChain, totalFiat, pending, fiatFlag, currency } =
    useGovernanceOverview(deferredAccountIds);
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null);

  const handleCloseDetail = useCallback(() => setSelectedChainId(null), []);

  if (!fiatFlag) return null;

  if (accountIds.length === 0) {
    return (
      <DashboardWidget colSpan={2}>
        <FootnoteText className="text-text-tertiary">{t('dashboard.governanceOverview.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  const selectedChain = selectedChainId ? chains.find((c) => c.chainId === selectedChainId) : null;

  return (
    <DashboardWidget colSpan={2}>
      <FootnoteText className="text-text-tertiary">{t('dashboard.governanceOverview.title')}</FootnoteText>
      <TitleText className="mt-1">
        {pending ? <Skeleton width={30} height={7} /> : <Price amount={totalFiat ?? '0'} currency={currency} />}
      </TitleText>

      {chains.length > 0 && (
        <>
          <div className="my-4 border-t border-divider" />
          <div className="flex gap-4">
            <LockAllocationChart chains={chains} />
            <div className="flex flex-1 flex-col gap-3">
              {chains.map((chain) => (
                <ChainRow
                  key={chain.chainId}
                  chain={chain}
                  currency={currency}
                  t={t}
                  onClick={() => setSelectedChainId(chain.chainId)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {!pending && chains.length === 0 && (
        <div className="flex flex-col items-center gap-y-1 py-6">
          <BodyText className="text-text-tertiary">{t('dashboard.governanceOverview.noGovernance')}</BodyText>
        </div>
      )}

      {pending && chains.length === 0 && (
        <div className="my-4 flex flex-col gap-3">
          <Skeleton width="100%" height={10} />
          <Skeleton width="100%" height={10} />
        </div>
      )}

      {selectedChain && (
        <GovernanceDetailModal
          chainSummary={selectedChain}
          votingMap={votingMapByChain[selectedChain.chainId] ?? {}}
          accountIds={accountIds}
          allEntries={allEntries}
          currency={currency}
          onClose={handleCloseDetail}
        />
      )}
    </DashboardWidget>
  );
};

type ChainRowProps = {
  chain: ChainGovernanceSummary;
  currency: ReturnType<typeof useGovernanceOverview>['currency'];
  t: ReturnType<typeof useI18n>['t'];
  onClick: () => void;
};

const ChainRow = memo(({ chain, currency, t, onClick }: ChainRowProps) => {
  const { formatted, suffix } = formatBalance(chain.totalLocked, chain.precision);
  const { formatted: claimFormatted, suffix: claimSuffix } = formatBalance(chain.claimableAmount, chain.precision);
  const hasClaimable = chain.claimableAmount !== '0';

  return (
    <div>
      <div
        className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-hover"
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <img src={chain.icon.colored} alt={chain.chainName} className="h-6 w-6" />
          <div>
            <FootnoteText className="text-text-primary">{chain.chainName}</FootnoteText>
            <FootnoteText className="text-text-tertiary">
              {formatted}
              {suffix ? ` ${suffix}` : ''} {chain.symbol}
              {' · '}
              {t('dashboard.governanceOverview.votingAccounts')}: {chain.activeVotingAccounts}
              {' · '}
              {t('dashboard.governanceOverview.convictionDisplay', {
                value: chain.averageConviction.toFixed(1),
              })}
            </FootnoteText>
          </div>
        </div>
        <FootnoteText className="text-text-secondary">
          <Price amount={chain.totalLockedFiat} currency={currency} />
        </FootnoteText>
      </div>
      {hasClaimable && (
        <div className="flex items-center justify-between pr-2 pl-10">
          <FootnoteText className="text-text-positive">
            {t('dashboard.governanceOverview.unlockable')} {claimFormatted}
            {claimSuffix ? ` ${claimSuffix}` : ''} {chain.symbol}
          </FootnoteText>
          <FootnoteText className="text-text-positive">
            <Price amount={chain.claimableFiat} currency={currency} />
          </FootnoteText>
        </div>
      )}
    </div>
  );
});

type ChartProps = {
  chains: ChainGovernanceSummary[];
};

const LockAllocationChart = memo(({ chains }: ChartProps) => {
  const filtered = chains
    .map((c, i) => ({
      name: c.chainName,
      value: parseFloat(c.totalLockedFiat),
      fill: getColorByPriceId(c.priceId, i),
    }))
    .filter((d) => d.value > 0);

  const total = filtered.reduce((sum, d) => sum + d.value, 0);
  const data = filtered.map((d) => ({
    ...d,
    percent: total > 0 ? (d.value / total) * 100 : 0,
  }));

  if (data.length === 0) return null;

  return (
    <PieChart width={160} height={160}>
      <Pie data={data} innerRadius={50} outerRadius={75} dataKey="value" stroke="none" animationDuration={400} />
      <Tooltip content={<ChartTooltip />} />
    </PieChart>
  );
});
