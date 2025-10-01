import { entries, groupBy, partition } from 'lodash';
import { memo, useMemo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText } from '@/shared/ui';
import { ScrollArea } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkUtils } from '@/entities/network';
import { Account } from '../Account/Account';

import { Collapsible } from './Collapsible';

type Props = {
  accounts: (readonly [chain: Chain, accountId: AccountId])[];
};

export const ConsensusAccountsList = memo(({ accounts }: Props) => {
  const { t } = useI18n();
  const { list } = useDeferredList({ list: accounts, forceFirstRender: true });

  const [evmAccounts, substrateAccounts] = useMemo(
    () => partition(list, ([chain]) => networkUtils.isEthereumBased(chain.options)),
    [list],
  );

  const groups = useMemo(() => {
    const result: { consensus: Props['accounts'][number]; parachains: Props['accounts'] }[] = [];

    const substrateAccountGroups = entries(groupBy(substrateAccounts, ([chain]) => chain.parentId ?? chain.chainId));

    for (const [consensusChainId, chains] of substrateAccountGroups) {
      const consensus = chains.find(([chain]) => chain.chainId === consensusChainId);
      if (consensus) {
        const parachains = chains.filter(([chain]) => chain.chainId !== consensusChainId);
        result.push({ consensus, parachains });
      }
    }

    for (const account of evmAccounts) {
      result.push({ consensus: account, parachains: [] });
    }

    return result;
  }, [evmAccounts, substrateAccounts]);

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
