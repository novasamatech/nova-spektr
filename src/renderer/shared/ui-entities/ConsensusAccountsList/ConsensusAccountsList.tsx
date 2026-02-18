import { t } from 'i18next';
import { entries, groupBy, partition } from 'lodash';
import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { useDeferredList } from '@/shared/lib/hooks';
import { RelayChains } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { networkUtils } from '@/entities/network';

import { EthAccountsGroup } from './EthAccountsGroup';
import { GroupItem } from './GroupItem';
import { ListItem } from './ListItem';
import { type ChainAccountPair } from './types';

const isConsensusChain = (chain: Chain): boolean => {
  const chainId = chain.parentId ?? chain.chainId;
  return (Object.values(RelayChains) as string[]).includes(chainId);
};

type ConsensusGroup = {
  consensus: ChainAccountPair;
  parachains: ChainAccountPair[];
};
const buildConsensusGroups = (consensusAccounts: ChainAccountPair[]): ConsensusGroup[] => {
  const groupedById = groupBy(consensusAccounts, ([chain]) => chain.parentId ?? chain.chainId);

  return entries(groupedById).reduce<ConsensusGroup[]>((groups, [groupId, chains]) => {
    const consensus = chains.find(([chain]) => chain.chainId === groupId);

    if (consensus) {
      const parachains = chains.filter(([chain]) => chain.chainId !== groupId);
      groups.push({ consensus, parachains });
    }

    return groups;
  }, []);
};

const SectionHeader = memo<{ label: string }>(({ label }) => (
  <div className="mx-5 mt-4 mb-2 grid grid-cols-2">
    <FootnoteText className="text-text-tertiary">{label}</FootnoteText>
    <FootnoteText className="text-text-tertiary">{t('walletDetails.common.accountsColumn')}</FootnoteText>
  </div>
));
SectionHeader.displayName = 'SectionHeader';

type Props = {
  accounts: ChainAccountPair[];
  bgColor?: string;
};
export const ConsensusAccountsList = memo(({ accounts, bgColor }: Props) => {
  const { list } = useDeferredList({ list: accounts });

  const [evmAccounts, restAccounts] = partition(list, ([chain]) => networkUtils.isEthereumBased(chain.options));
  const [consensusAccounts, otherAccounts] = partition(restAccounts, ([chain]) => isConsensusChain(chain));
  const consensusGroups = buildConsensusGroups(consensusAccounts);

  const shouldShowConsensusChains = consensusAccounts.length > 0;
  const shouldShowOtherChains = evmAccounts.length > 0 || otherAccounts.length > 0;

  return (
    <div className="flex flex-col">
      {shouldShowConsensusChains && (
        <>
          <SectionHeader label={t('walletDetails.common.consensusColumn')} />
          <section className="flex flex-col divide-y divide-divider px-5 pb-3">
            {consensusGroups.map(({ consensus: [consensusChain, consensusAccountId], parachains }) => (
              <GroupItem
                key={consensusChain.chainId}
                groupChain={consensusChain}
                groupAccountId={consensusAccountId}
                parachains={parachains}
                bgColor={bgColor}
              />
            ))}
          </section>
        </>
      )}
      {shouldShowOtherChains && (
        <>
          <SectionHeader label={t('walletDetails.common.otherNetworkColumn')} />
          <section className="flex flex-col divide-y divide-divider px-5 pb-3">
            {evmAccounts.length > 0 && <EthAccountsGroup chains={evmAccounts} bgColor={bgColor} />}
            {otherAccounts.map(([chain, accountId]) => (
              <div key={chain.chainId} className="pl-6">
                <ListItem chain={chain} accountId={accountId} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
});
