import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { SearchInput } from '@/shared/ui-kit';
import { type Vote as VoteType } from '@/domains/collectives';
import { identityModel } from '../model/identity';

import { Vote } from './Vote';
import { VotingHistoryListEmptyState } from './VotingHistoryListEmptyState';

type Props = {
  items: VoteType[];
  chain: Chain | null;
  loading?: boolean;
};

export const VotingHistoryList = ({ items, chain, loading }: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState<string>('');

  const identity = useUnit(identityModel.$identity);

  const extendedItems = items.map(item => ({
    ...item,
    address: toAddress(item.accountId, { prefix: chain?.addressPrefix }),
    name: identity[item.accountId].name ?? null,
  }));

  const filteredItems = performSearch({ records: extendedItems, query, weights: { address: 0.5, name: 1 } });

  const { list: deferredItems, isLoading: shouldRenderLoader } = useDeferredList({
    list: filteredItems,
    isLoading: !!loading,
  });

  if (!chain) {
    return null;
  }

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
          <div className="flex w-full flex-col gap-1">
            {shouldRenderEmptyState && <VotingHistoryListEmptyState />}
            {shouldRenderList && deferredItems.map(vote => <Vote key={vote.accountId} item={vote} chain={chain} />)}
          </div>
        </div>
      </div>
    </div>
  );
};
