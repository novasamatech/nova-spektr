import { useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, SmallTitleText, TitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';

import { AssetDetailModal } from './AssetDetailModal';
import { ChainDetailModal } from './ChainDetailModal';
import { ChainHoldingsList } from './ChainHoldingsList';
import { HoldingsList } from './HoldingsList';
import { Price } from './Price';
import { useChainHoldings } from './useChainHoldings';
import { useHoldings } from './useHoldings';

type EntryLike = { accountId: string; name: string; address: string };

type ViewMode = 'asset' | 'chain';

type Props = {
  accountIds: string[];
  allEntries: EntryLike[];
};

const containerClass = 'max-w-[480px] rounded-lg border border-token-container-border bg-white p-4 shadow-card-shadow';

const toggleButtonClass = 'flex-1 rounded px-3 py-1 text-footnote font-semibold transition-colors';
const activeToggleClass = 'bg-white text-text-primary shadow-sm';
const inactiveToggleClass = 'text-text-tertiary hover:text-text-secondary';

export const TotalBalanceWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const { holdings, totalFiat, fiatFlag, currency } = useHoldings(accountIds);
  const { chainHoldings } = useChainHoldings(accountIds);
  const [viewMode, setViewMode] = useState<ViewMode>('asset');
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null);

  const selectedHolding = holdings.find((h) => h.priceId === selectedPriceId) ?? null;
  const selectedChainHolding = chainHoldings.find((h) => h.chainId === selectedChainId) ?? null;

  if (!fiatFlag) return null;

  if (accountIds.length === 0) {
    return (
      <div className={containerClass}>
        <FootnoteText className="text-text-tertiary">{t('dashboard.totalBalance.title')}</FootnoteText>
        <div className="flex flex-col items-center gap-y-1 py-6">
          <SmallTitleText className="text-text-tertiary">{t('dashboard.noSelection.title')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('dashboard.noSelection.description')}</BodyText>
        </div>
      </div>
    );
  }

  const hasData = (viewMode === 'asset' ? holdings.length > 0 : chainHoldings.length > 0) && totalFiat !== null;

  return (
    <div className={containerClass}>
      <FootnoteText className="text-text-tertiary">{t('dashboard.totalBalance.title')}</FootnoteText>
      <TitleText className="mt-1">
        {totalFiat === null ? <Skeleton width={120} height={28} /> : <Price amount={totalFiat} currency={currency} />}
      </TitleText>

      {hasData && (
        <>
          <div className="my-4 border-t border-divider" />

          <div className="mb-3 flex rounded-md bg-tab-background p-0.5">
            <button
              className={`${toggleButtonClass} ${viewMode === 'asset' ? activeToggleClass : inactiveToggleClass}`}
              onClick={() => setViewMode('asset')}
            >
              {t('dashboard.totalBalance.byAsset')}
            </button>
            <button
              className={`${toggleButtonClass} ${viewMode === 'chain' ? activeToggleClass : inactiveToggleClass}`}
              onClick={() => setViewMode('chain')}
            >
              {t('dashboard.totalBalance.byChain')}
            </button>
          </div>

          {viewMode === 'asset' ? (
            <HoldingsList holdings={holdings} currency={currency} onSelect={(h) => setSelectedPriceId(h.priceId)} />
          ) : (
            <ChainHoldingsList
              chainHoldings={chainHoldings}
              currency={currency}
              onSelect={(h) => setSelectedChainId(h.chainId)}
            />
          )}
        </>
      )}

      {selectedHolding && (
        <AssetDetailModal
          holding={selectedHolding}
          accountIds={accountIds}
          allEntries={allEntries}
          currency={currency}
          onClose={() => setSelectedPriceId(null)}
        />
      )}

      {selectedChainHolding && (
        <ChainDetailModal
          chainHolding={selectedChainHolding}
          accountIds={accountIds}
          currency={currency}
          onClose={() => setSelectedChainId(null)}
        />
      )}
    </div>
  );
};
