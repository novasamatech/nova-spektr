import { memo, useDeferredValue, useMemo, useState } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Chain } from '@shared/core';
import { formatAsset, formatBalance, performSearch, toAccountId } from '@shared/lib/utils';
import { BodyText, FootnoteText, SearchInput } from '@shared/ui';
import { SignatoryCard } from '@entities/signatory';
import { AddressWithName } from '@entities/wallet';
import { type AggregatedVoteHistory } from '../../types/structs';

import { VotingHistoryListEmptyState } from './VotingHistoryListEmptyState';
import { VotingHistoryListPlaceholder } from './VotingHistoryListPlaceholder';

type Props = {
  items: AggregatedVoteHistory[];
  chain: Chain | null;
  asset: Asset | null;
  loading?: boolean;
};

export const VotingHistoryList = memo<Props>(({ items, asset, chain, loading }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>('');

  const filteredItems = useMemo(
    () => performSearch({ records: items, query, weights: { voter: 0.5, name: 1 } }),
    [items, query],
  );
  const deferredItems = useDeferredValue(filteredItems);

  if (!chain || !asset) {
    return null;
  }

  const shouldRenderLoader = !!loading;
  const shouldRenderEmptyState = !shouldRenderLoader && deferredItems.length === 0;
  const shouldRenderList = !shouldRenderLoader && deferredItems.length > 0;

  return (
    <div className="flex flex-col gap-6 pb-4 pt-6">
      <SearchInput placeholder={t('governance.searchPlaceholder')} value={query} onChange={setQuery} />
      <div className="min-h-0">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between px-2">
            <FootnoteText className="text-text-tertiary">{t('governance.voteHistory.listColumnAccount')}</FootnoteText>
            <FootnoteText className="text-text-tertiary">
              {t('governance.voteHistory.listColumnVotingPower')}
            </FootnoteText>
          </div>
          <div className="flex flex-col gap-1">
            {shouldRenderLoader && <VotingHistoryListPlaceholder />}
            {shouldRenderEmptyState && <VotingHistoryListEmptyState />}
            {shouldRenderList &&
              deferredItems.map(({ voter, balance, votingPower, conviction, name }) => {
                return (
                  <div key={`${voter}-${balance.toString()}-${conviction}`} className="flex gap-2">
                    <div className="min-w-0 shrink grow">
                      <SignatoryCard
                        className="min-h-11.5"
                        accountId={toAccountId(voter)}
                        addressPrefix={chain?.addressPrefix}
                        explorers={chain?.explorers}
                      >
                        <AddressWithName
                          addressFont="text-text-secondary"
                          address={voter}
                          type="adaptive"
                          name={name ?? undefined}
                        />
                      </SignatoryCard>
                    </div>
                    <div className="flex shrink-0 basis-28 flex-col items-end gap-0.5 pe-2">
                      <BodyText className="whitespace-nowrap">
                        {t('governance.voteHistory.totalVotesCount', {
                          value: formatBalance(votingPower, asset.precision).formatted,
                        })}
                      </BodyText>
                      <FootnoteText className="whitespace-nowrap text-text-tertiary">
                        {t('general.actions.multiply', {
                          value: formatAsset(balance, asset),
                          multiplier: conviction,
                        })}
                      </FootnoteText>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
});
