import { memo, useDeferredValue, useMemo, useState } from 'react';
import { useGate, useStoreMap, useUnit } from 'effector-react';

import { SignatoryCard } from '@entities/signatory';
import { AddressWithName } from '@entities/wallet';
import { BaseModal, BodyText, FootnoteText, Icon, Loader, SearchInput, Tabs } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { cnTw, formatBalance, performSearch, toAccountId } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { Asset, type Chain, type Referendum } from '@shared/core';
import { type TabItem } from '@shared/ui/Tabs/common/types';
import { type AggregatedVoteHistory } from '../../types/structs';
import { voteHistoryAggregate } from '../../aggregates/voteHistory';

type Props = {
  referendum: Referendum;
  onClose: VoidFunction;
};

const VotingHistoryList = memo<{ items: AggregatedVoteHistory[]; chain: Chain | null; asset: Asset | null }>(
  ({ items, asset, chain }) => {
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

    return (
      <div className="flex flex-col gap-6 pt-6">
        <SearchInput placeholder={t('governance.searchPlaceholder')} value={query} onChange={setQuery} />
        <div className="overflow-y-auto min-h-0">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between px-2">
              <FootnoteText className="text-text-tertiary">Account</FootnoteText>
              <FootnoteText className="text-text-tertiary">Voting power</FootnoteText>
            </div>
            <div className="flex flex-col gap-1">
              {deferredItems.map(({ voter, balance, conviction, name }) => {
                const votingPowerBalance = balance.muln(conviction * 10).divn(10);
                const formattedVotingPower = formatBalance(votingPowerBalance.toString(), asset.precision);
                const formattedBalance = formatBalance(balance.toString(), asset.precision);

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
                        {formattedVotingPower.formatted} votes {asset.symbol}
                      </BodyText>
                      <FootnoteText className="whitespace-nowrap text-right text-text-tertiary">
                        {formattedBalance.formatted} {asset.symbol} × {conviction}
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
  },
);

const VotingHistoryLoadingScreen = () => {
  return (
    <div className="flex items-center justify-center h-40 w-full">
      <Loader color="primary" />
    </div>
  );
};

export const VotingHistoryDialog = ({ referendum, onClose }: Props) => {
  useGate(voteHistoryAggregate.gates.flow, { referendumId: referendum.referendumId });

  const { t } = useI18n();
  const [showModal, closeModal] = useModalClose(true, onClose);
  const [selectedTab, setSelectedTab] = useState(0);

  const chain = useUnit(voteHistoryAggregate.$chain);

  const voteHistory = useStoreMap({
    store: voteHistoryAggregate.$voteHistory,
    keys: [referendum.referendumId],
    fn: (x, [referendumId]) => x[referendumId] ?? [],
  });

  const votingAsset = useStoreMap({
    store: voteHistoryAggregate.$votingAssets,
    keys: [chain?.chainId],
    fn: (x, [chainId]) => (chainId ? x[chainId] ?? null : null),
  });

  const isLoading = useUnit(voteHistoryAggregate.$voteHistoryLoading);

  const ayes = useMemo(() => voteHistory.filter((history) => history.decision === 'aye'), [voteHistory]);
  const nays = useMemo(() => voteHistory.filter((history) => history.decision === 'nay'), [voteHistory]);
  const abstain = useMemo(() => voteHistory.filter((history) => history.decision === 'abstain'), [voteHistory]);

  const tabs: TabItem[] = [
    {
      id: 'ayes',
      title: (
        <span className="flex items-center gap-1">
          <Icon name="thumbUp" size={16} className={cnTw(selectedTab === 0 && 'text-icon-positive')} />
          <span>{t('governance.referendum.ayes')}</span>
          <FootnoteText as="span" className="text-text-tertiary">
            {ayes.length}
          </FootnoteText>
        </span>
      ),
      panel: isLoading ? (
        <VotingHistoryLoadingScreen />
      ) : (
        <VotingHistoryList chain={chain} asset={votingAsset} items={ayes} />
      ),
    },
    {
      id: 'nays',
      title: (
        <span className="flex items-center gap-1">
          <Icon name="thumbDown" size={16} className={cnTw(selectedTab === 1 && 'text-icon-negative')} />
          <span>{t('governance.referendum.nays')}</span>
          <FootnoteText as="span" className="text-text-tertiary">
            {nays.length}
          </FootnoteText>
        </span>
      ),
      panel: isLoading ? (
        <VotingHistoryLoadingScreen />
      ) : (
        <VotingHistoryList chain={chain} asset={votingAsset} items={nays} />
      ),
    },
    {
      id: 'abstain',
      title: (
        <span className="flex items-center gap-1">
          <Icon name="minusCircle" size={16} />
          <span>{t('governance.referendum.abstain')}</span>
          <FootnoteText as="span" className="text-text-tertiary">
            {abstain.length}
          </FootnoteText>
        </span>
      ),
      panel: isLoading ? (
        <VotingHistoryLoadingScreen />
      ) : (
        <VotingHistoryList chain={chain} asset={votingAsset} items={abstain} />
      ),
    },
  ];

  return (
    <BaseModal
      isOpen={showModal}
      closeButton
      panelClass="flex flex-col w-modal max-h-[650px] overflow-hidden"
      headerClass="shrink-0 pl-5 pr-3 pt-3"
      contentClass="flex flex-col py-4 px-5 overflow-hidden"
      title={t('governance.voteHistory.title')}
      onClose={closeModal}
    >
      <Tabs panelClassName="overflow-y-auto" items={tabs} onChange={setSelectedTab} />
    </BaseModal>
  );
};
