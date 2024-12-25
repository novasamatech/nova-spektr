import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Box, ScrollArea, Tooltip } from '@/shared/ui-kit';
import { type Vote as VoteType } from '@/domains/collectives';
import { identityModel } from '../model/identity';

import { Vote } from './Vote';
import { VotingHistoryListEmptyState } from './VotingHistoryListEmptyState';

type Props = {
  query: string;
  items: VoteType[];
  chain: Chain | null;
  loading?: boolean;
};

export const VotingHistoryList = ({ items, query, chain, loading }: Props) => {
  const { t } = useI18n();

  const identity = useUnit(identityModel.$identity);

  const filteredItems = useMemo(() => {
    return performSearch({
      records: items,
      getMeta: item => ({
        address: toAddress(item.accountId, { prefix: chain?.addressPrefix }),
        name: identity[item.accountId].name ?? null,
      }),
      query,
      weights: { address: 0.5, name: 1 },
    });
  }, [items, query]);

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
    <div className="flex h-full w-full flex-col gap-1">
      <div className="flex h-full w-full flex-col gap-1">
        {shouldRenderEmptyState && <VotingHistoryListEmptyState />}
        {shouldRenderList && (
          <ScrollArea>
            <Box direction="row" horizontalAlign="space-between" padding={[4, 7, 2]}>
              <FootnoteText className="text-text-tertiary">
                {t('governance.voteHistory.listColumnAccount')}
              </FootnoteText>
              <Box gap={1} direction="row" verticalAlign="center">
                <FootnoteText className="text-text-tertiary">
                  {t('governance.voteHistory.listColumnVotingPower')}
                </FootnoteText>
                <Tooltip>
                  <Tooltip.Trigger>
                    <div>
                      <Icon name="info" size={16} />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('fellowship.votingHistory.votingPowerDescription')}</Tooltip.Content>
                </Tooltip>
              </Box>
            </Box>

            <Box padding={[0, 5, 4]}>
              {deferredItems.map(vote => (
                <Vote key={vote.accountId} item={vote} chain={chain} />
              ))}
            </Box>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};
