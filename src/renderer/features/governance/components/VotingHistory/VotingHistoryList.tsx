import { memo, useMemo, useState } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { formatAsset, performSearch, toAccountId } from '@/shared/lib/utils';
import { EmptyList, FootnoteText } from '@/shared/ui';
import { AccountExplorers, Address, AssetBalance } from '@/shared/ui-entities';
import { Box, ScrollArea, SearchInput } from '@/shared/ui-kit';
import { type AggregatedVoteHistory } from '../../types/structs';

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
    <Box fitContainer>
      {items.length > 0 && (
        <>
          <Box padding={[6, 5]} shrink={0}>
            <SearchInput placeholder={t('governance.searchPlaceholder')} value={query} onChange={setQuery} />
          </Box>

          <Box direction="row" horizontalAlign="space-between" padding={[0, 5, 2]} shrink={0}>
            <FootnoteText className="text-text-tertiary">{t('governance.voteHistory.listColumnAccount')}</FootnoteText>
            <FootnoteText className="text-text-tertiary">
              {t('governance.voteHistory.listColumnVotingPower')}
            </FootnoteText>
          </Box>
        </>
      )}

      <ScrollArea>
        <Box gap={1} padding={[0, 3, 2]}>
          {shouldRenderLoader && <VotingHistoryListPlaceholder />}

          {shouldRenderEmptyState && <EmptyList message={t('governance.voteHistory.listEmptyState')} />}

          {shouldRenderList &&
            deferredItems.map(({ voter, balance, votingPower, conviction, name }) => {
              return (
                <div key={`${voter}-${balance.toString()}-${conviction}`} className="flex gap-3 px-2 text-body">
                  <div className="flex min-w-0 shrink grow items-center gap-1">
                    <Address address={voter} title={name ?? ''} variant="truncate" showIcon />
                    <AccountExplorers accountId={toAccountId(voter)} chain={chain} />
                  </div>
                  <div className="flex shrink-0 basis-28 flex-col items-end gap-0.5">
                    <AssetBalance value={votingPower} asset={asset} />
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
        </Box>
      </ScrollArea>
    </Box>
  );
});
