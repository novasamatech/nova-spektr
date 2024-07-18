import { memo, useDeferredValue, useMemo, useState } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Chain } from '@shared/core';
import { formatBalance, performSearch, toAccountId } from '@shared/lib/utils';
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
    <div className="flex flex-col gap-6 pt-6">
      <SearchInput placeholder={t('governance.searchPlaceholder')} value={query} onChange={setQuery} />
      <div className="overflow-y-auto min-h-0">
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
              deferredItems.map(({ voter, balance, conviction, name }) => {
                const votingPowerBalance = balance.muln(conviction * 10).divn(10);
                const formattedVotingPower = formatBalance(votingPowerBalance, asset.precision);
                const formattedBalance = formatBalance(balance, asset.precision);

                return (
                  <div key={voter} className="flex">
                    <div className="grow shrink min-w-0">
                      <SignatoryCard
                        className="min-h-11.5"
                        accountId={toAccountId(voter)}
                        addressPrefix={chain?.addressPrefix}
                      >
                        <AddressWithName address={voter} type="adaptive" name={name ?? undefined} />
                      </SignatoryCard>
                    </div>
                    <div className="flex flex-col basis-32 shrink-0 px-2 gap-0.5">
                      <BodyText className="whitespace-nowrap text-right">
                        {t('governance.voteHistory.totalVotesCount', {
                          value: formattedVotingPower.formatted,
                          symbol: asset.symbol,
                        })}
                      </BodyText>
                      <FootnoteText className="whitespace-nowrap text-right text-text-tertiary">
                        {t('governance.voteHistory.totalVotesCountConviction', {
                          value: `${formattedBalance.formatted} ${asset.symbol}`,
                          conviction,
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
