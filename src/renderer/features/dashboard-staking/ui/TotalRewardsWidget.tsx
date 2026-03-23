import { useRef, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { BodyText, FootnoteText, SmallTitleText, TitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { DashboardWidget } from '@/pages/Dashboard';
import { type EntryLike } from '../hooks/useStakingBreakdown';
import { useTotalRewards } from '../hooks/useTotalRewards';

import { ChainAllocationChart } from './ChainAllocationChart';
import { Price } from './Price';
import { RewardsDetailModal } from './RewardsDetailModal';

type Props = {
  accountIds: string[];
  allEntries: EntryLike[];
};

type RewardsTimeRange = '7d' | '1m' | '6m' | '1y' | 'all';

const RANGES: RewardsTimeRange[] = ['7d', '1m', '6m', '1y', 'all'];

const SINCE_OFFSETS: Record<Exclude<RewardsTimeRange, 'all'>, number> = {
  '7d': 7 * 24 * 3600,
  '1m': 30 * 24 * 3600,
  '6m': 180 * 24 * 3600,
  '1y': 365 * 24 * 3600,
};

const toggleButtonClass = 'flex-1 rounded px-3 py-1 text-footnote font-semibold transition-colors';
const activeClass = 'bg-white text-text-primary shadow-sm';
const inactiveClass = 'text-text-tertiary hover:text-text-secondary';

export const TotalRewardsWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<RewardsTimeRange>('all');
  // Freeze `since` per range: computed once on first selection, reused on return.
  // Without this, Date.now() drifts each render → new cache key → 7 requests per render.
  const sinceCache = useRef<Partial<Record<Exclude<RewardsTimeRange, 'all'>, number>>>({});
  const since = (() => {
    if (timeRange === 'all') return undefined;
    if (sinceCache.current[timeRange] === undefined) {
      sinceCache.current[timeRange] = Math.floor(Date.now() / 1000) - SINCE_OFFSETS[timeRange];
    }
    return sinceCache.current[timeRange];
  })();
  const { chains, rewardsMapByChain, totalFiat, pending, fiatFlag, currency } = useTotalRewards(accountIds, since);
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null);

  if (!fiatFlag) return null;

  const selectedChain = selectedChainId ? (chains.find((c) => c.chainId === selectedChainId) ?? null) : null;

  if (accountIds.length === 0) {
    return (
      <DashboardWidget>
        <FootnoteText className="text-text-tertiary">{t('dashboard.totalRewards.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  const rangeLabels: Record<RewardsTimeRange, string> = {
    '7d': t('dashboard.totalRewards.range7d'),
    '1m': t('dashboard.totalRewards.range1m'),
    '6m': t('dashboard.totalRewards.range6m'),
    '1y': t('dashboard.totalRewards.range1y'),
    all: t('dashboard.totalRewards.rangeAll'),
  };

  return (
    <DashboardWidget>
      <div className="flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('dashboard.totalRewards.title')}</FootnoteText>
        <div className="flex w-fit rounded-md bg-tab-background p-0.5">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              className={`${toggleButtonClass} ${timeRange === range ? activeClass : inactiveClass}`}
              onClick={() => setTimeRange(range)}
            >
              {rangeLabels[range]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <TitleText className="mt-1">
            {pending ? <Skeleton width={30} height={7} /> : <Price amount={totalFiat ?? '0'} currency={currency} />}
          </TitleText>
        </div>
      </div>

      {chains.length > 0 && (
        <>
          <div className="my-4 border-t border-divider" />
          <div className="flex gap-3">
            <ChainAllocationChart chains={chains} />
            <div className="flex flex-1 flex-col gap-3">
              {chains.map((chain) => {
                const { formatted, suffix } = formatBalance(chain.totalRewards, chain.precision);

                return (
                  <button
                    key={chain.chainId}
                    type="button"
                    className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-hover"
                    onClick={() => setSelectedChainId(chain.chainId)}
                  >
                    <div className="flex items-center gap-2">
                      <img src={chain.icon.colored} alt={chain.chainName} className="h-6 w-6" />
                      <div>
                        <FootnoteText className="text-text-primary">{chain.chainName}</FootnoteText>
                        <FootnoteText className="text-text-tertiary">
                          {formatted}
                          {suffix ? ` ${suffix}` : ''} {chain.symbol}
                        </FootnoteText>
                      </div>
                    </div>
                    <FootnoteText className="text-text-secondary">
                      <Price amount={chain.fiatValue} currency={currency} />
                    </FootnoteText>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!pending && chains.length === 0 && (
        <div className="flex flex-col items-center gap-y-1 py-6">
          <BodyText className="text-text-tertiary">{t('dashboard.totalRewards.noRewards')}</BodyText>
        </div>
      )}

      {pending && chains.length === 0 && (
        <>
          <div className="my-4 border-t border-divider" />
          <div className="flex gap-3">
            <Skeleton circle width={40} />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton width="100%" height={10} />
              <Skeleton width="100%" height={10} />
            </div>
          </div>
        </>
      )}

      {selectedChain && (
        <RewardsDetailModal
          chainSummary={selectedChain}
          rewardsMap={rewardsMapByChain[selectedChain.chainId] ?? {}}
          accountIds={accountIds}
          allEntries={allEntries}
          currency={currency}
          onClose={() => setSelectedChainId(null)}
        />
      )}
    </DashboardWidget>
  );
};
