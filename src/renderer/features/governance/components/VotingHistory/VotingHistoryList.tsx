import { memo, useMemo, useState } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { formatAsset, formatBalance, performSearch, toAccountId } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { AccountExplorers, Address } from '@/shared/ui-entities';
import { SearchInput } from '@/shared/ui-kit';
import { type AggregatedVoteHistory } from '../../types/structs';

import { VotingHistoryListEmptyState } from './VotingHistoryListEmptyState';
import { VotingHistoryListPlaceholder } from './VotingHistoryListPlaceholder';

type Props = {
  items: AggregatedVoteHistory[];
  chain: Chain | null;
  asset: Asset | null;
  loading?: boolean;
};

export const VotingHistoryList = memo(({ items, asset, chain, loading }: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>('');

  const filteredItems = useMemo(
    () => performSearch({ records: items, query, weights: { voter: 0.5, name: 1 } }),
    [items, query],
  );
  const { list: deferredItems, isLoading } = useDeferredList({ list: filteredItems, isLoading: !!loading });

  if (!chain || !asset) {
    return null;
  }

  const shouldRenderLoader = isLoading;
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
                  <div key={`${voter}-${balance.toString()}-${conviction}`} className="flex gap-3 px-2 text-body">
                    <div className="flex min-w-0 shrink grow items-center gap-1">
                      <Address address={voter} title={name ?? ''} variant="truncate" showIcon />
                      <AccountExplorers accountId={toAccountId(voter)} chain={chain} />
                    </div>
                    <div className="flex shrink-0 basis-28 flex-col items-end gap-0.5">
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
