import { memo, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Account, Address, AssetBalance } from '@/shared/ui-entities';
import { Accordion, Box, EmptyMessage, ScrollArea, SearchInput } from '@/shared/ui-kit';
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
            deferredItems.map(({ voter, name, decision, totalVotingPower, directVote, delegatedVotes }) => {
              const groupId = `${voter}-${decision}`;
              const hasDelegatedVotes = delegatedVotes.length > 0;

              return (
                <div key={groupId} className="space-y-1">
                  {hasDelegatedVotes ? (
                    <div className="[&_button]:!py-0 [&_button]:hover:!bg-transparent">
                      <Accordion>
                        <Accordion.Trigger>
                          <div className="grid h-11 w-full grid-cols-[224px_1fr] items-center gap-x-3 text-body text-text-primary normal-case">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <Account
                                  hideAddress
                                  iconSize={20}
                                  title={name ?? ''}
                                  accountId={voter}
                                  chain={chain}
                                  variant="truncate"
                                />
                              </div>
                            </div>

                            <Box direction="column" horizontalAlign="end">
                              {directVote && (
                                <FootnoteText>
                                  <Trans
                                    t={t}
                                    i18nKey="general.actions.multiply"
                                    values={{ multiplier: directVote.conviction }}
                                    components={{
                                      balance: (
                                        <AssetBalance
                                          className="text-footnote"
                                          value={directVote.balance}
                                          asset={asset}
                                        />
                                      ),
                                    }}
                                  />
                                </FootnoteText>
                              )}
                              <AssetBalance
                                className="text-footnote text-text-tertiary"
                                asset={asset}
                                value={totalVotingPower}
                              />
                            </Box>
                          </div>
                        </Accordion.Trigger>
                        <Accordion.Content>
                          <div className="ml-4">
                            {delegatedVotes.map((delegatedVote, index) => (
                              <div
                                key={`${delegatedVote.delegator}-${index}`}
                                className="grid grid-cols-[224px_1fr] items-center gap-x-3 rounded-md bg-action-background-hover px-2 py-1"
                              >
                                <Address
                                  variant="truncate"
                                  address={toAddress(delegatedVote.delegator, { prefix: chain.addressPrefix })}
                                />

                                <Box direction="column" horizontalAlign="end">
                                  <FootnoteText>
                                    <Trans
                                      t={t}
                                      i18nKey="general.actions.multiply"
                                      values={{ multiplier: delegatedVote.conviction }}
                                      components={{
                                        balance: (
                                          <AssetBalance
                                            className="text-footnote"
                                            value={delegatedVote.balance}
                                            asset={asset}
                                          />
                                        ),
                                      }}
                                    />
                                  </FootnoteText>
                                  <AssetBalance
                                    className="text-footnote text-text-tertiary"
                                    asset={asset}
                                    value={delegatedVote.votingPower}
                                  />
                                </Box>
                              </div>
                            ))}
                          </div>
                        </Accordion.Content>
                      </Accordion>
                    </div>
                  ) : (
                    <div className="grid h-11 grid-cols-[224px_1fr] items-center gap-x-3 px-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Account
                            hideAddress
                            iconSize={20}
                            title={name ?? ''}
                            accountId={voter}
                            chain={chain}
                            variant="truncate"
                          />
                        </div>
                      </div>

                      <Box direction="column" horizontalAlign="end">
                        {directVote && (
                          <FootnoteText>
                            <Trans
                              t={t}
                              i18nKey="general.actions.multiply"
                              values={{ multiplier: directVote.conviction }}
                              components={{
                                balance: (
                                  <AssetBalance className="text-footnote" value={directVote.balance} asset={asset} />
                                ),
                              }}
                            />
                          </FootnoteText>
                        )}
                        <AssetBalance
                          className="text-footnote text-text-tertiary"
                          asset={asset}
                          value={totalVotingPower}
                        />
                      </Box>
                    </div>
                  )}
                </div>
              );
            })}
        </Box>
      </ScrollArea>
    </Box>
  );
});
