import { default as BigNumber } from 'bignumber.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, HelpText, Loader, SmallTitleText, TitleText } from '@/shared/ui';
import { ALLOCATION_COLORS } from '@/shared/ui/chart-constants';
import { DashboardWidget } from '@/pages/Dashboard';
import { useBalanceAllocation } from '../hooks/useBalanceAllocation';
import { useBalancesArrived } from '../hooks/useBalancesArrived';
import { useBalancesSyncing } from '../hooks/useBalancesSyncing';
import { type ChainHolding, useChainHoldings } from '../hooks/useChainHoldings';
import { type Holding, useHoldings } from '../hooks/useHoldings';
import { type BalanceType } from '../lib/balanceTypes';

import { AssetDetailModal } from './AssetDetailModal';
import { BalanceTypeBar } from './BalanceTypeBar';
import { ChainDetailModal } from './ChainDetailModal';
import { type ChainHoldingRowItem, ChainHoldingsList } from './ChainHoldingsList';
import { type HoldingRowItem, HoldingsList } from './HoldingsList';
import { PortfolioOverviewSkeleton } from './PortfolioOverviewSkeleton';
import { Price } from './Price';

type EntryLike = { accountId: string; name: string; address: string };

/**
 * Rendered inside the Portfolio Overview card, just below the balance-type
 * distribution. The vesting-claim feature injects its callout here.
 *
 * The slot stays propless: vesting follows the card's account filter, but that
 * selection is pushed to the vesting-portfolio aggregate via
 * `accountsScopeChanged` (wired in this feature's `index.ts`) rather than
 * threaded through the slot, so the injected block reads the scoped result for
 * itself.
 */
export const portfolioVestingSlot = createSlot({ name: 'portfolioVesting' });

type ViewMode = 'asset' | 'chain';

type Props = {
  accountIds: string[];
  allEntries: EntryLike[];
};

const toggleButtonClass = 'cursor-pointer rounded px-4 py-1.5 text-footnote font-semibold transition-colors';
const activeToggleClass = 'bg-white text-text-primary shadow-sm';
const inactiveToggleClass = 'text-text-tertiary hover:text-text-secondary';

/**
 * Backstop for an account set whose balances never arrive at all.
 *
 * Not the mechanism that decides emptiness — that is `balancesArrived`, below.
 * This only bounds the wait, because a chain whose RPC is down keeps retrying
 * for the life of the app and would otherwise pin the skeleton forever. Long on
 * purpose: the cost of it being short is the very bug it replaced — a "no
 * tokens" shown to a user who has plenty, while the Portfolio page is still
 * shimmering for the same accounts. Matches the deadline the vesting aggregate
 * gives chains for the same reason.
 */
const EMPTY_BACKSTOP_MS = 30_000;

export const PortfolioOverviewWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const { holdings, totalFiat, fiatFlag, currency } = useHoldings(accountIds);
  const { chainHoldings } = useChainHoldings(accountIds);
  const allocation = useBalanceAllocation(accountIds);
  const isSyncing = useBalancesSyncing();
  const balancesArrived = useBalancesArrived(accountIds);
  const [viewMode, setViewMode] = useState<ViewMode>('asset');
  const [balanceTypeFilter, setBalanceTypeFilter] = useState<BalanceType | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null);

  // Re-armed per account set: a new selection is a new question, and its
  // balances may not be in the store yet even though the previous one's were.
  const accountKey = accountIds.join(',');
  const [backstopElapsed, setBackstopElapsed] = useState(false);
  useEffect(() => {
    setBackstopElapsed(false);
    const id = setTimeout(() => setBackstopElapsed(true), EMPTY_BACKSTOP_MS);

    return () => clearTimeout(id);
  }, [accountKey]);

  const selectedHolding = holdings.find((h) => h.priceId === selectedPriceId) ?? null;
  const selectedChainHolding = chainHoldings.find((h) => h.chainId === selectedChainId) ?? null;

  const switchToAssetView = useCallback(() => setViewMode('asset'), []);
  const switchToChainView = useCallback(() => setViewMode('chain'), []);
  const toggleBalanceType = useCallback((type: BalanceType) => {
    setBalanceTypeFilter((prev) => (prev === type ? null : type));
  }, []);
  const clearBalanceTypeFilter = useCallback(() => setBalanceTypeFilter(null), []);
  const handleHoldingSelect = useCallback((h: Holding) => setSelectedPriceId(h.priceId), []);
  const handleChainSelect = useCallback((h: ChainHolding) => setSelectedChainId(h.chainId), []);
  const closeAssetDetail = useCallback(() => setSelectedPriceId(null), []);
  const closeChainDetail = useCallback(() => setSelectedChainId(null), []);

  // Holdings scoped to the active balance-type filter, with share of the scope total.
  // Zero fiat only means "nothing of this type" under a filter — without one, keep every held asset.
  // Scoped rows are re-sorted by the scoped fiat: the source order (and the donut
  // palette derived from row index) follows total fiat, which is wrong under a filter.
  const { assetRows, assetScopeTotal } = useMemo(() => {
    const scoped = balanceTypeFilter
      ? holdings
          .map((h) => ({
            ...h,
            totalRaw: h.byType[balanceTypeFilter].raw,
            fiatValue: h.byType[balanceTypeFilter].fiat,
          }))
          .filter((h) => new BigNumber(h.fiatValue).gt(0))
          .sort((a, b) => new BigNumber(b.fiatValue).comparedTo(a.fiatValue))
      : holdings;
    const scopeTotal = scoped.reduce((sum, h) => sum.plus(h.fiatValue), new BigNumber(0));
    const rows: HoldingRowItem[] = scoped.map((h) => ({
      ...h,
      sharePercent: scopeTotal.gt(0) ? new BigNumber(h.fiatValue).div(scopeTotal).times(100).toNumber() : 0,
    }));

    return { assetRows: rows, assetScopeTotal: scopeTotal.toString() };
  }, [holdings, balanceTypeFilter]);

  const { chainRows, chainScopeTotal } = useMemo(() => {
    const scoped = balanceTypeFilter
      ? chainHoldings
          .map((h) => ({
            ...h,
            fiatValue: h.byType[balanceTypeFilter].fiat,
            assetCount: h.byType[balanceTypeFilter].assetCount,
          }))
          .filter((h) => new BigNumber(h.fiatValue).gt(0))
          .sort((a, b) => new BigNumber(b.fiatValue).comparedTo(a.fiatValue))
      : chainHoldings;
    const scopeTotal = scoped.reduce((sum, h) => sum.plus(h.fiatValue), new BigNumber(0));
    const rows: ChainHoldingRowItem[] = scoped.map((h) => ({
      ...h,
      sharePercent: scopeTotal.gt(0) ? new BigNumber(h.fiatValue).div(scopeTotal).times(100).toNumber() : 0,
    }));

    return { chainRows: rows, chainScopeTotal: scopeTotal.toString() };
  }, [chainHoldings, balanceTypeFilter]);

  // fiat display is off — the fiat-driven breakdown (total, allocation, donut)
  // has nothing to show, but the injected vesting block is token-denominated
  // and stays useful
  if (!fiatFlag) {
    return (
      <DashboardWidget>
        <FootnoteText className="text-text-tertiary">{t('dashboard.portfolioOverview.title')}</FootnoteText>
        <BodyText className="mt-2 text-text-tertiary">{t('dashboard.portfolioOverview.fiatDisabledHint')}</BodyText>
        <Slot id={portfolioVestingSlot} />
      </DashboardWidget>
    );
  }

  if (accountIds.length === 0) {
    return (
      <DashboardWidget>
        <FootnoteText className="text-text-tertiary">{t('dashboard.portfolioOverview.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </DashboardWidget>
    );
  }

  if (totalFiat === null) {
    return (
      <DashboardWidget>
        <PortfolioOverviewSkeleton />
      </DashboardWidget>
    );
  }

  // Prices resolved, but the selected accounts hold nothing priced and there is
  // no vesting to surface either — a real, empty answer (see `useHoldings` /
  // `useBalanceAllocation`). Distinct from a balance-type filter that scopes to
  // zero, which reads off the raw `holdings`, not the filtered rows.
  const isEmpty = holdings.length === 0 && !allocation;
  if (isEmpty) {
    // Nothing has been read for these accounts yet, so there is nothing to be
    // empty about — shimmer, exactly as the Portfolio page does for a row whose
    // balance has not landed. Zero holdings is not evidence on its own: a
    // balance of zero produces none either, so the two are indistinguishable
    // until the first record arrives.
    if (!balancesArrived && !backstopElapsed) {
      return (
        <DashboardWidget>
          <PortfolioOverviewSkeleton />
        </DashboardWidget>
      );
    }

    return (
      <DashboardWidget>
        <FootnoteText className="text-text-tertiary">{t('dashboard.portfolioOverview.title')}</FootnoteText>
        <TitleText className="mt-1">
          <Price amount={totalFiat} currency={currency} />
        </TitleText>

        <Slot id={portfolioVestingSlot} />

        <div className="mt-4 flex flex-col items-center gap-y-1 border-t border-divider py-8">
          <SmallTitleText className="text-text-tertiary">
            {t('dashboard.portfolioOverview.noTokens.title')}
          </SmallTitleText>
          <BodyText className="text-center text-text-tertiary">
            {t('dashboard.portfolioOverview.noTokens.description')}
          </BodyText>
          {isSyncing && (
            <span className="mt-2 flex items-center gap-1.5">
              <Loader size={12} color="primary" />
              <HelpText className="text-text-tertiary">{t('dashboard.portfolioOverview.syncing')}</HelpText>
            </span>
          )}
        </div>
      </DashboardWidget>
    );
  }

  const scopeLabel = balanceTypeFilter
    ? t(`dashboard.portfolioOverview.balanceType.${balanceTypeFilter}`)
    : t(viewMode === 'asset' ? 'dashboard.portfolioOverview.allAssets' : 'dashboard.portfolioOverview.allNetworks');
  const scopeColor = balanceTypeFilter ? ALLOCATION_COLORS[balanceTypeFilter] : undefined;

  const hasData = viewMode === 'asset' ? assetRows.length > 0 : chainRows.length > 0;

  return (
    <DashboardWidget>
      <div className="flex items-start justify-between gap-4">
        <div>
          <FootnoteText className="text-text-tertiary">{t('dashboard.portfolioOverview.title')}</FootnoteText>
          <TitleText className="mt-1">
            <Price amount={totalFiat} currency={currency} />
          </TitleText>
        </div>
        <div className="flex shrink-0 rounded-md bg-tab-background p-0.5">
          <button
            className={`${toggleButtonClass} ${viewMode === 'asset' ? activeToggleClass : inactiveToggleClass}`}
            onClick={switchToAssetView}
          >
            {t('dashboard.portfolioOverview.byAsset')}
          </button>
          <button
            className={`${toggleButtonClass} ${viewMode === 'chain' ? activeToggleClass : inactiveToggleClass}`}
            onClick={switchToChainView}
          >
            {t('dashboard.portfolioOverview.byChain')}
          </button>
        </div>
      </div>

      {allocation && (
        <div className="mt-4">
          <BalanceTypeBar
            allocation={allocation}
            currency={currency}
            syncing={isSyncing}
            selectedType={balanceTypeFilter}
            onToggleType={toggleBalanceType}
            onClear={clearBalanceTypeFilter}
          />
        </div>
      )}

      <Slot id={portfolioVestingSlot} />

      {hasData && (
        <div className="mt-4 border-t border-divider pt-4">
          {viewMode === 'asset' ? (
            <HoldingsList
              holdings={assetRows}
              totalFiat={assetScopeTotal}
              scopeLabel={scopeLabel}
              scopeColor={scopeColor}
              currency={currency}
              onSelect={handleHoldingSelect}
            />
          ) : (
            <ChainHoldingsList
              chainHoldings={chainRows}
              totalFiat={chainScopeTotal}
              scopeLabel={scopeLabel}
              scopeColor={scopeColor}
              currency={currency}
              onSelect={handleChainSelect}
            />
          )}
        </div>
      )}

      {selectedHolding && (
        <AssetDetailModal
          holding={selectedHolding}
          accountIds={accountIds}
          allEntries={allEntries}
          currency={currency}
          onClose={closeAssetDetail}
        />
      )}

      {selectedChainHolding && (
        <ChainDetailModal
          chainHolding={selectedChainHolding}
          accountIds={accountIds}
          currency={currency}
          onClose={closeChainDetail}
        />
      )}
    </DashboardWidget>
  );
};
