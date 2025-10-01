import { entries, groupBy } from 'lodash';
import { memo, useMemo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText } from '@/shared/ui';
import { Collapsible, ScrollArea } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { Account } from '../Account/Account';

type Props = {
  accounts: (readonly [chain: Chain, accountId: AccountId])[];
};

export const ConsensusAccountsList = memo(({ accounts }: Props) => {
  const { t } = useI18n();
  const { list } = useDeferredList({ list: accounts, forceFirstRender: true });

  const groups = useMemo(() => {
    return entries(groupBy(list, ([chain]) => chain.parentId ?? chain.chainId))
      .map(([consensusChainId, chains]) => {
        const consensus = chains.find(([chain]) => chain.chainId === consensusChainId);
        if (!consensus) return null;
        const parachains = chains.filter(([chain]) => chain.chainId !== consensusChainId);

        return { consensus, parachains };
      })
      .filter(nonNullable);
  }, [list]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-5 mt-4 mb-2 grid grid-cols-2">
        <FootnoteText className="text-text-tertiary">{t('walletDetails.common.consensusColumn')}</FootnoteText>
        <FootnoteText className="text-text-tertiary">{t('walletDetails.common.accountsColumn')}</FootnoteText>
      </div>
      <ScrollArea>
        <section className="flex flex-col divide-y divide-divider px-5 pb-3">
          {groups.map(({ consensus, parachains }) => {
            const [consensusChain, consensusAccountId] = consensus;
            if (parachains.length) {
              return (
                <Collapsible key={consensusChain.chainId}>
                  <Collapsible.Trigger sticky>
                    <ListItem chain={consensusChain} accountId={consensusAccountId} />
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <div className="divide-y divide-divider pl-6">
                      {parachains.map(([parachain, accountId]) => (
                        <ListItem key={parachain.chainId} chain={parachain} accountId={accountId} />
                      ))}
                    </div>
                  </Collapsible.Content>
                </Collapsible>
              );
            }
            return (
              <div key={consensusChain.chainId} className="pl-6">
                <ListItem chain={consensusChain} accountId={consensusAccountId} />
              </div>
            );
          })}
        </section>
      </ScrollArea>
    </div>
  );
});

const ListItem = memo(({ chain, accountId }: { chain: Chain; accountId: AccountId }) => {
  return (
    <div className="grid w-full min-w-0 grid-cols-[calc(50%-16px)_1fr] items-center gap-2 py-4 pr-2 text-footnote">
      <ChainTitle fontClass="text-text-primary" chain={chain} />
      <div className="min-w-0 text-text-secondary">
        <Account variant="truncate" accountId={accountId} chain={chain} explorersTestId={TEST_IDS.COMMON.INFO_BUTTON} />
      </div>
    </div>
  );
});
