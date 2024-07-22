import { useStoreMap } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Referendum } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, BodyText, FootnoteText } from '@shared/ui';
import { votingService } from '@entities/governance';
import { AddressWithName } from '@entities/wallet';
import { detailsAggregate } from '../../aggregates/details';

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
    fn: (x, [referendumId]) => votingService.getAllReferendumVotes(referendumId, x),
  });

  const votesList = useMemo(() => Object.entries(votes).map(([address, vote]) => ({ address, vote })), [votes]);

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
            <BodyText className="px-2">{vote.type}</BodyText>
            <div>
              <BodyText className="whitespace-nowrap">
                {t('governance.voteHistory.totalVotesCount', {
                  value: formattedVotingPower.formatted,
                  symbol: asset.symbol,
                })}
              </BodyText>
              <FootnoteText className="whitespace-nowrap text-text-tertiary">
                {t('governance.voteHistory.totalVotesCountConviction', {
                  value: `${formattedBalance.formatted} ${asset.symbol}`,
                  conviction,
                })}
              </FootnoteText>
            </div>
          </>
        );
      })}
    </BaseModal>
  );
};
