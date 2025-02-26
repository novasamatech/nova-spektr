import { useStoreMap, useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { formatAsset, nonNullable, toAccountId } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { votingService } from '@/entities/governance';
import { walletModel, walletUtils } from '@/entities/wallet';
import { detailsAggregate } from '../../aggregates/details';
import { proposerIdentityAggregate } from '../../aggregates/proposerIdentity';
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

  const voter = useStoreMap({
    store: proposerIdentityAggregate.$proposers,
    keys: [referendum.votedByDelegate?.delegateId],
    fn: (proposers, [delegateId]) => (delegateId ? (proposers[delegateId] ?? null) : null),
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
              <>
                <div className="col-span-5" key={address}>
                  <BodyText className="text-text-secondary">
                    <Account
                      hideAddress
                      iconSize={16}
                      title={account?.name}
                      variant="short"
                      accountId={toAccountId(address)}
                      chain={chain}
                    />
                  </BodyText>
                </div>
                <BodyText key={`decision-${address}`} className="col-span-2 px-2">
                  {t(`governance.referendum.${vote.decision}`)}
                </BodyText>
                <div
                  key={`votingPower-${address}`}
                  className="col-span-5 flex shrink-0 flex-col items-end gap-0.5 px-2"
                >
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
              </>
            );
          })}

          {/* Delegation */}
          {nonNullable(referendum.votedByDelegate) && (
            <>
              <div className="col-span-5">
                <BodyText className="text-text-secondary">
                  <Account
                    hideAddress
                    iconSize={16}
                    title={voter?.parent.name}
                    variant="short"
                    accountId={toAccountId(referendum.votedByDelegate.delegateId)}
                    chain={chain}
                  />
                </BodyText>
              </div>
              <BodyText className="col-span-2 px-2">
                {t(`governance.referendum.${referendum.votedByDelegate.decision}`)}
              </BodyText>
              <div className="col-span-5 flex shrink-0 flex-col items-end gap-0.5 px-2">
                <BodyText className="whitespace-nowrap">
                  <AssetBalance
                    value={votingService.calculateVotingPower(
                      referendum.votedByDelegate.amount,
                      referendum.votedByDelegate.conviction,
                    )}
                    asset={asset}
                  />
                </BodyText>
                <FootnoteText className="whitespace-nowrap text-text-tertiary">
                  {t('general.actions.multiply', {
                    value: formatAsset(referendum.votedByDelegate.amount, asset),
                    multiplier: votingService.getConvictionMultiplier(referendum.votedByDelegate.conviction),
                  })}
                </FootnoteText>
              </div>
            </>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
};
