import { t } from 'i18next';
import { entries, groupBy, partition } from 'lodash';
import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Chain } from '@/shared/core';
import { useDeferredList } from '@/shared/lib/hooks';
import { RelayChains } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText } from '@/shared/ui';
import { ScrollArea } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkUtils } from '@/entities/network';
import { Account } from '../Account/Account';

import { Collapsible } from './Collapsible';

type ChainAccountPair = readonly [chain: Chain, accountId: AccountId];

const EVM_CHAIN_CONFIG = {
  chainId: 'evm',
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Ethereum.svg',
  name: t('walletDetails.vault.evmGroup'),
};

const isConsensusChain = (chain: Chain): boolean => {
  const chainId = chain.parentId ?? chain.chainId;
  return Object.values(RelayChains).includes(chainId);
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

type ListItemProps = {
  chain: Chain;
  accountId: AccountId;
};
const ListItem = memo<ListItemProps>(({ chain, accountId }) => (
  <div className="grid w-full min-w-0 grid-cols-[calc(50%-16px)_1fr] items-center gap-2 py-4 pr-2 text-footnote">
    <ChainTitle fontClass="text-text-primary" chain={chain} />
    <div className="min-w-0 text-text-secondary">
      <Account variant="truncate" accountId={accountId} chain={chain} explorersTestId={TEST_IDS.COMMON.INFO_BUTTON} />
    </div>
  </div>
));
ListItem.displayName = 'ListItem';

type GroupItemProps = {
  groupChain: Chain;
  groupAccountId: AccountId;
  parachains: ChainAccountPair[];
  bgColor?: string;
};
const GroupItem = memo<GroupItemProps>(({ groupChain, groupAccountId, parachains, bgColor }) => {
  if (parachains.length > 0) {
    return (
      <Collapsible>
        <Collapsible.Trigger sticky bgColor={bgColor}>
          <ListItem chain={groupChain} accountId={groupAccountId} />
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
    <div key={groupChain.chainId} className="pl-6">
      <ListItem chain={groupChain} accountId={groupAccountId} />
    </div>
  );
});
GroupItem.displayName = 'GroupItem';

const SectionHeader = memo<{ label: string }>(({ label }) => (
  <div className="mx-5 mt-4 mb-2 grid grid-cols-2">
    <FootnoteText className="text-text-tertiary">{label}</FootnoteText>
    <FootnoteText className="text-text-tertiary">{t('walletDetails.common.accountsColumn')}</FootnoteText>
  </div>
));
SectionHeader.displayName = 'SectionHeader';

const ConsensusSection = memo<{ groups: ConsensusGroup[]; bgColor?: string }>(({ groups, bgColor }) => (
  <>
    <SectionHeader label={t('walletDetails.common.consensusColumn')} />
    <section className="flex flex-col divide-y divide-divider px-5 pb-3">
      {groups.map(({ consensus: [consensusChain, consensusAccountId], parachains }) => (
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
));
ConsensusSection.displayName = 'ConsensusSection';

const OtherNetworksSection = memo<{
  evmAccounts: ChainAccountPair[];
  otherAccounts: ChainAccountPair[];
  bgColor?: string;
}>(({ evmAccounts, otherAccounts, bgColor }) => (
  <>
    <SectionHeader label={t('walletDetails.common.otherNetworkColumn')} />
    <section className="flex flex-col divide-y divide-divider px-5 pb-3">
      {evmAccounts.length > 0 && (
        <GroupItem
          key={EVM_CHAIN_CONFIG.chainId}
          groupChain={EVM_CHAIN_CONFIG as unknown as Chain}
          groupAccountId={evmAccounts[0]![1]}
          parachains={evmAccounts}
          bgColor={bgColor}
        />
      )}
      {otherAccounts.map(([chain, accountId]) => (
        <div key={chain.chainId} className="pl-6">
          <ListItem chain={chain} accountId={accountId} />
        </div>
      ))}
    </section>
  </>
));
OtherNetworksSection.displayName = 'OtherNetworksSection';

type Props = {
  accounts: ChainAccountPair[];
  bgColor?: string;
};
export const ConsensusAccountsList = memo(({ accounts, bgColor }: Props) => {
  const { list } = useDeferredList({ list: accounts, forceFirstRender: true });

  const [evmAccounts, restAccounts] = partition(list, ([chain]) => networkUtils.isEthereumBased(chain.options));
  const [consensusAccounts, otherAccounts] = partition(restAccounts, ([chain]) => isConsensusChain(chain));
  const consensusGroups = buildConsensusGroups(consensusAccounts);

  const shouldShowConsensusChains = consensusAccounts.length > 0;
  const shouldShowOtherChains = evmAccounts.length > 0 || otherAccounts.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea>
        {shouldShowConsensusChains && <ConsensusSection groups={consensusGroups} bgColor={bgColor} />}
        {shouldShowOtherChains && (
          <OtherNetworksSection evmAccounts={evmAccounts} otherAccounts={otherAccounts} bgColor={bgColor} />
        )}
      </ScrollArea>
    </div>
  );
});
