import { useStoreMap } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Referendum } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { formatBalance } from '@shared/lib/utils';
import { BaseModal, BodyText, FootnoteText } from '@shared/ui';
import { votingService } from '@entities/governance';
import { AddressWithName } from '@entities/wallet';
import { detailsAggregate } from '../../aggregates/details';
import { votingListService } from '../../lib/votingListService';

type Props = {
  referendum: Referendum;
  asset: Asset | null;
  onClose: VoidFunction;
};

export const WalletVotesDialog = ({ referendum, asset, onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, closeModal] = useModalClose(true, onClose);

  const votes = useStoreMap({
    store: detailsAggregate.$votes,
    keys: [referendum.referendumId],
    fn: (votes, [referendumId]) => votingService.getReferendumAccountVotes(referendumId, votes),
  });

  const votesList = useMemo(
    () =>
      Object.entries(votes).flatMap(([address, vote]) => {
        return votingListService.getDecoupledVotesFromVote(vote).map((vote) => ({ address, vote }));
      }),
    [votes],
  );

  if (!asset) {
    return null;
  }

  return (
    <BaseModal
      isOpen={isOpen}
      title={t('governance.walletVotes.title')}
      closeButton
      panelClass="w-modal"
      contentClass="py-4 px-5 grid grid-cols-3 items-center"
      onClose={closeModal}
    >
      <FootnoteText className="px-2 pb-1 text-text-tertiary">
        {t('governance.walletVotes.listColumnAccount')}
      </FootnoteText>
      <FootnoteText className="px-2 pb-1 text-text-tertiary">{t('governance.walletVotes.listColumnVote')}</FootnoteText>
      <FootnoteText className="px-2 pb-1 text-text-tertiary text-end">
        {t('governance.walletVotes.listColumnVotingPower')}
      </FootnoteText>
      {votesList.map(({ address, vote }) => {
        return (
          <>
            <AddressWithName className="px-2 py-3" addressFont="text-text-secondary" address={address} />
            <BodyText className="px-2">{t(`governance.referendum.${vote.decision}`)}</BodyText>
            <div className="flex flex-col basis-32 shrink-0 px-2 gap-0.5 items-end">
              <BodyText className="whitespace-nowrap">
                {t('governance.walletVotes.totalVotesCount', {
                  value: formatBalance(vote.votingPower, asset.precision).formatted,
                  symbol: asset.symbol,
                })}
              </BodyText>
              <FootnoteText className="whitespace-nowrap text-text-tertiary">
                {t('governance.walletVotes.totalVotesCountConviction', {
                  value: `${formatBalance(vote.balance, asset.precision).formatted} ${asset.symbol}`,
                  conviction: vote.conviction,
                })}
              </FootnoteText>
            </div>
          </>
        );
      })}
    </BaseModal>
  );
};
