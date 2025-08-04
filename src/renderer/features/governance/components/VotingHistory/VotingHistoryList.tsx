import { memo, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { performSearch } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Box, EmptyMessage, ScrollArea, SearchInput } from '@/shared/ui-kit';
import { type AggregatedVoteHistory } from '../../types/structs';

import { VotingHistoryListPlaceholder } from './VotingHistoryListPlaceholder';

type Props = {
  items: AggregatedVoteHistory[];
  chain: Chain | null;
  asset: Asset | null;
  listName: string;
  loading?: boolean;
};

export const VotingHistoryList = memo(({ items, asset, listName, chain, loading }: Props) => {
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

          {shouldRenderEmptyState && (
            <EmptyMessage
              title={t('governance.voteHistory.listEmptyTitle', { list: listName })}
              description={t('governance.voteHistory.listEmptyDescription')}
            />
          )}

          {shouldRenderList &&
            deferredItems.map(({ voter, balance, conviction, votingPower, name }) => {
              return (
                <div
                  key={`${voter}-${balance.toString()}-${conviction}`}
                  className="grid h-11 grid-cols-[224px_1fr] items-center gap-x-3 px-2"
                >
                  <Account
                    hideAddress
                    iconSize={20}
                    title={name ?? ''}
                    accountId={voter}
                    chain={chain}
                    variant="truncate"
                  />

                  <Box direction="column" horizontalAlign="end">
                    <FootnoteText>
                      <Trans
                        t={t}
                        i18nKey="general.actions.multiply"
                        values={{ multiplier: conviction }}
                        components={{
                          balance: <AssetBalance className="text-footnote" value={balance} asset={asset} />,
                        }}
                      />
                    </FootnoteText>
                    <AssetBalance className="text-footnote text-text-tertiary" asset={asset} value={votingPower} />
                  </Box>
                </div>
              );
            })}
        </Box>
      </ScrollArea>
    </Box>
  );
});
