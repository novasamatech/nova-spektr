import { useStoreMap, useUnit } from 'effector-react';
import { Fragment, useMemo } from 'react';
import { Trans } from 'react-i18next';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { entries, toAccountId } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { votingService } from '@/entities/governance';
import { walletSelect } from '@/aggregates/wallet-select';
import { NamedAccount } from '@/widgets/NameResolver';
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

  const activeWallet = useUnit(walletSelect.$selectedWallet);

  const votes = useStoreMap({
    store: detailsAggregate.$votes,
    keys: [referendum.referendumId],
    fn: (votes, [referendumId]) => votingService.getReferendumVoting(referendumId, votes),
  });

  const votesList = useMemo(() => {
    return entries(votes).flatMap(([accountId, vote]) => {
      return votingListService
        .getDecoupledVotesFromVote(referendum.referendumId, vote)
        .map((vote) => ({ accountId, vote }));
    });
  }, [votes, referendum]);

  if (!activeWallet) return null;

  return (
    <Modal isOpen={isOpen} size="md" onToggle={closeModal}>
      <Modal.Title close>{t('governance.walletVotes.title')}</Modal.Title>
      <Modal.Content>
        <div className="grid grid-cols-12 items-center px-5 pb-4">
          <FootnoteText className="col-span-5 pr-2 pb-1 text-text-tertiary">
            {t('governance.walletVotes.listColumnAccount')}
          </FootnoteText>
          <FootnoteText className="col-span-2 basis-16 px-2 pb-1 text-text-tertiary">
            {t('governance.walletVotes.listColumnVote')}
          </FootnoteText>
          <FootnoteText className="col-span-5 px-2 pb-1 text-end text-text-tertiary">
            {t('governance.walletVotes.listColumnVotingPower')}
          </FootnoteText>
          {votesList.map(({ accountId, vote }) => (
            <Fragment key={accountId}>
              <div className="col-span-5">
                <BodyText className="text-text-secondary">
                  <NamedAccount hideAddress variant="short" iconSize={16} accountId={accountId} chain={chain} />
                </BodyText>
              </div>
              <BodyText className="col-span-2 px-2">{t(`governance.referendum.${vote.decision}`)}</BodyText>
              <div className="col-span-5 flex shrink-0 flex-col items-end gap-0.5 px-2">
                <Box direction="column" horizontalAlign="end">
                  <FootnoteText>
                    <Trans
                      t={t}
                      i18nKey="general.actions.multiply"
                      values={{ multiplier: vote.conviction }}
                      components={{ balance: <AssetBalance value={vote.balance} asset={asset} /> }}
                    />
                  </FootnoteText>
                  <AssetBalance className="text-footnote text-text-tertiary" asset={asset} value={vote.votingPower} />
                </Box>
              </div>
            </Fragment>
          ))}

          {referendum.votedByDelegates.map((delegate) => (
            <Fragment key={delegate.delegator}>
              <div className="col-span-5">
                <BodyText className="text-text-secondary">
                  {/* TODO: display delegated identity in subtitle */}
                  <NamedAccount
                    hideAddress
                    variant="short"
                    iconSize={16}
                    accountId={toAccountId(delegate.delegator)}
                    chain={chain}
                  />
                </BodyText>
              </div>

              <BodyText className="col-span-2 px-2">{t(`governance.referendum.${delegate.decision}`)}</BodyText>

              <div className="col-span-5 flex shrink-0 flex-col items-end gap-0.5 px-2">
                <Box direction="column" horizontalAlign="end">
                  <FootnoteText>
                    <Trans
                      t={t}
                      i18nKey="general.actions.multiply"
                      values={{ multiplier: votingService.getConvictionMultiplier(delegate.conviction) }}
                      components={{ balance: <AssetBalance value={delegate.amount} asset={asset} /> }}
                    />
                  </FootnoteText>
                  <AssetBalance
                    className="text-footnote text-text-tertiary"
                    asset={asset}
                    value={votingService.calculateVotingPower(delegate.amount, delegate.conviction)}
                  />
                </Box>
              </div>
            </Fragment>
          ))}
        </div>
      </Modal.Content>
    </Modal>
  );
};
