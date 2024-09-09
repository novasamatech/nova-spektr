import { useStoreMap } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Chain, type Referendum } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { formatAsset, formatBalance, toAccountId } from '@shared/lib/utils';
import { BaseModal, BodyText, FootnoteText } from '@shared/ui';
import { votingService } from '@entities/governance';
import { SignatoryCard } from '@entities/signatory';
import { AddressWithName } from '@entities/wallet';
import { detailsAggregate } from '../../aggregates/details';
import { votingListService } from '../../lib/votingListService';

type Props = {
  referendum: Referendum;
  asset: Asset;
  chain: Chain;
  onClose: VoidFunction;
};

export const MyVotesDialog = ({ referendum, asset, chain, onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, closeModal] = useModalClose(true, onClose);

  const votes = useStoreMap({
    store: detailsAggregate.$votes,
    keys: [referendum.referendumId],
    fn: (votes, [referendumId]) => votingService.getReferendumVoting(referendumId, votes),
  });

  const votesList = useMemo(
    () =>
      Object.entries(votes).flatMap(([address, vote]) => {
        return votingListService
          .getDecoupledVotesFromVote(referendum.referendumId, vote)
          .map((vote) => ({ address, vote }));
      }),
    [votes, referendum],
  );

  return (
    <BaseModal
      isOpen={isOpen}
      title={t('governance.walletVotes.title')}
      closeButton
      panelClass="w-modal"
      contentClass="py-4 px-5 grid grid-cols-12 items-center"
      onClose={closeModal}
    >
      <FootnoteText className="col-span-5 px-2 pb-1 text-text-tertiary">
        {t('governance.walletVotes.listColumnAccount')}
      </FootnoteText>
      <FootnoteText className="col-span-2 basis-16 px-2 pb-1 text-text-tertiary">
        {t('governance.walletVotes.listColumnVote')}
      </FootnoteText>
      <FootnoteText className="col-span-5 px-2 pb-1 text-end text-text-tertiary">
        {t('governance.walletVotes.listColumnVotingPower')}
      </FootnoteText>
      {votesList.map(({ address, vote }) => {
        return (
          <>
            <div className="col-span-5">
              <SignatoryCard
                key={address}
                className="min-h-11"
                accountId={toAccountId(address)}
                addressPrefix={chain.addressPrefix}
              >
                <AddressWithName addressFont="text-text-secondary" address={address} type="adaptive" />
              </SignatoryCard>
            </div>
            <BodyText key={`decision-${address}`} className="col-span-2 px-2">
              {t(`governance.referendum.${vote.decision}`)}
            </BodyText>
            <div key={`votingPower-${address}`} className="col-span-5 flex shrink-0 flex-col items-end gap-0.5 px-2">
              <BodyText className="whitespace-nowrap">
                {t('governance.walletVotes.totalVotesCount', {
                  value: formatBalance(vote.votingPower, asset.precision).formatted,
                })}
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
    </BaseModal>
  );
};
