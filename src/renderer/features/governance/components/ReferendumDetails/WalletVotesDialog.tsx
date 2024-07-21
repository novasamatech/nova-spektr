import { BN_ZERO } from '@polkadot/util';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { type AccountVote, type Referendum } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, BodyText, FootnoteText } from '@shared/ui';
import { AddressWithName } from '@entities/wallet';

type Props = {
  referendum: Referendum;
  onClose: VoidFunction;
};

export const WalletVotesDialog = ({ referendum, onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, closeModal] = useModalClose(true, onClose);

  // const votes = useStoreMap({
  //   store: detailsAggregate.$votes,
  //   keys: [referendum.referendumId],
  //   fn: (x, [referendumId]) => votingService.getAllReferendumVotes(referendumId, x),
  // });
  const votes: Record<string, AccountVote> = {
    'hello boss': {
      type: 'standard',
      referendumId: '0',
      track: '0',
      balance: BN_ZERO,
      vote: {
        conviction: 'Locked1x',
        type: 'aye',
      },
    },
  };

  const votesList = useMemo(() => Object.entries(votes).map(([address, vote]) => ({ address, vote })), [votes]);

  return (
    <BaseModal
      isOpen={isOpen}
      title={t('governance.walletVotes.title')}
      closeButton
      panelClass="w-modal"
      contentClass="py-4 px-5 grid grid-cols-3 items-center"
      onClose={closeModal}
    >
      <FootnoteText className="px-2 pb-1 text-text-tertiary">Account</FootnoteText>
      <FootnoteText className="px-2 pb-1 text-text-tertiary">Vote</FootnoteText>
      <FootnoteText className="px-2 pb-1 text-text-tertiary text-end">Voting power</FootnoteText>
      {votesList.map(({ address, vote }) => (
        <>
          <AddressWithName className="px-2 py-3" addressFont="text-text-secondary" address={address} />
          <BodyText className="px-2">{vote.type}</BodyText>
          <BodyText className="px-2 text-end">{vote.track}</BodyText>
        </>
      ))}
    </BaseModal>
  );
};
