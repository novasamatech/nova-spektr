import { useStoreMap, useUnit } from 'effector-react';
import { Fragment, useMemo } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { formatAsset, toAccountId } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { votingService } from '@/entities/governance';
import { walletModel, walletUtils } from '@/entities/wallet';
import { detailsAggregate } from '../../aggregates/details';
import { votingListService } from '../../lib/votingListService';
import { type AggregatedReferendum } from '../../types/structs';

type Props = {
  referendum: AggregatedReferendum;
  asset: Asset;
  chain: Chain;
  onClose: VoidFunction;
};

export const MyVotesModal = ({ referendum, asset, chain, onClose }: Props) => {
  const { t } = useI18n();

  const [isOpen, closeModal] = useModalClose(true, onClose);

  const activeWallet = useUnit(walletModel.$activeWallet);

  const votes = useStoreMap({
    store: detailsAggregate.$votes,
    keys: [referendum.referendumId],
    fn: (votes, [referendumId]) => votingService.getReferendumVoting(referendumId, votes),
  });

  const votesList = useMemo(() => {
    return Object.entries(votes).flatMap(([address, vote]) => {
      return votingListService
        .getDecoupledVotesFromVote(referendum.referendumId, vote)
        .map((vote) => ({ address, vote }));
    });
  }, [votes, referendum]);

  if (!activeWallet) return null;

  return (
    <Modal isOpen={isOpen} size="md" onToggle={closeModal}>
      <Modal.Title close>{t('governance.walletVotes.title')}</Modal.Title>
      <Modal.Content>
        <div className="grid grid-cols-12 items-center px-5 pb-4">
          <FootnoteText className="col-span-5 pb-1 pr-2 text-text-tertiary">
            {t('governance.walletVotes.listColumnAccount')}
          </FootnoteText>
          <FootnoteText className="col-span-2 basis-16 px-2 pb-1 text-text-tertiary">
            {t('governance.walletVotes.listColumnVote')}
          </FootnoteText>
          <FootnoteText className="col-span-5 px-2 pb-1 text-end text-text-tertiary">
            {t('governance.walletVotes.listColumnVotingPower')}
          </FootnoteText>
          {votesList.map(({ address, vote }) => {
            const account = walletUtils.getAccountBy(
              [activeWallet],
              (account) => account.accountId === toAccountId(address),
            );

            return (
              <Fragment key={address}>
                <div className="col-span-5">
                  <BodyText className="text-text-secondary">
                    <Account
                      hideAddress
                      variant="short"
                      iconSize={16}
                      title={account?.name}
                      accountId={toAccountId(address)}
                      chain={chain}
                    />
                  </BodyText>
                </div>
                <BodyText className="col-span-2 px-2">{t(`governance.referendum.${vote.decision}`)}</BodyText>
                <div className="col-span-5 flex shrink-0 flex-col items-end gap-0.5 px-2">
                  <BodyText className="whitespace-nowrap">
                    <AssetBalance value={vote.votingPower} asset={asset} />
                  </BodyText>
                  <FootnoteText className="whitespace-nowrap text-text-tertiary">
                    {t('general.actions.multiply', {
                      value: formatAsset(vote.balance, asset),
                      multiplier: vote.conviction,
                    })}
                  </FootnoteText>
                </div>
              </Fragment>
            );
          })}

          {referendum.votedByDelegates.map((delegate) => {
            const account = walletUtils.getAccountBy(
              [activeWallet],
              (account) => account.accountId === toAccountId(delegate.delegator),
            );

            return (
              <Fragment key={delegate.delegator}>
                <div className="col-span-5">
                  <BodyText className="text-text-secondary">
                    {/* TODO: display delegated identity in subtitle */}
                    <Account
                      hideAddress
                      variant="short"
                      iconSize={16}
                      title={account?.name}
                      accountId={toAccountId(delegate.delegator)}
                      chain={chain}
                    />
                  </BodyText>
                </div>
                <BodyText className="col-span-2 px-2">{t(`governance.referendum.${delegate.decision}`)}</BodyText>
                <div className="col-span-5 flex shrink-0 flex-col items-end gap-0.5 px-2">
                  <BodyText className="whitespace-nowrap">
                    <AssetBalance
                      asset={asset}
                      value={votingService.calculateVotingPower(delegate.amount, delegate.conviction)}
                    />
                  </BodyText>
                  <FootnoteText className="whitespace-nowrap text-text-tertiary">
                    {t('general.actions.multiply', {
                      value: formatAsset(delegate.amount, asset),
                      multiplier: votingService.getConvictionMultiplier(delegate.conviction),
                    })}
                  </FootnoteText>
                </div>
              </Fragment>
            );
          })}
        </div>
      </Modal.Content>
    </Modal>
  );
};
