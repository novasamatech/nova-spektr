import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, SmallTitleText, TitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';

import { AssetDetailModal } from './AssetDetailModal';
import { HoldingsList } from './HoldingsList';
import { Price } from './Price';
import { useHoldings } from './useHoldings';

type EntryLike = { accountId: string; name: string; address: string };

type Props = {
  accountIds: string[];
  allEntries: EntryLike[];
};

const containerClass = 'max-w-[480px] rounded-lg border border-token-container-border bg-white p-4 shadow-card-shadow';

export const TotalBalanceWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();
  const { holdings, totalFiat, fiatFlag, currency } = useHoldings(accountIds);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);

  const selectedHolding = holdings.find((h) => h.priceId === selectedPriceId) ?? null;

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

  return (
    <div className={containerClass}>
      <FootnoteText className="text-text-tertiary">{t('dashboard.totalBalance.title')}</FootnoteText>
      <TitleText className="mt-1">
        {totalFiat === null ? <Skeleton width={120} height={28} /> : <Price amount={totalFiat} currency={currency} />}
      </TitleText>

      {holdings.length > 0 && totalFiat !== null && (
        <>
          <div className="my-4 border-t border-divider" />
          <HoldingsList holdings={holdings} currency={currency} onSelect={(h) => setSelectedPriceId(h.priceId)} />
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
    </div>
  );
};
