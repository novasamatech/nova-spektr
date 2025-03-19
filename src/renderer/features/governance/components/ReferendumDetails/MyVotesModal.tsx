import { useStoreMap, useUnit } from 'effector-react';
import { Fragment, useMemo } from 'react';
import { Trans } from 'react-i18next';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, FootnoteText } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { votingService } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
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

  const accountsNames = useMemo(() => {
    if (nullable(activeWallet)) return {};

    const addressMap: Record<AccountId, string> = {};
    for (const account of activeWallet.accounts) {
      addressMap[account.accountId] = account.name;
    }

    const addresses = [
      ...votesList.map((vote) => vote.address),
      ...referendum.votedByDelegates.map((delegate) => delegate.delegator),
    ];

    const votedAccounts: Record<AccountId, string> = {};
    for (const address of addresses) {
      const accountId = toAccountId(address);
      if (nullable(addressMap[accountId])) continue;

      votedAccounts[accountId] = addressMap[accountId];
    }

    return votedAccounts;
  }, [activeWallet, votesList, referendum]);

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
          {votesList.map(({ address, vote }) => (
            <Fragment key={address}>
              <div className="col-span-5">
                <BodyText className="text-text-secondary">
                  <Account
                    hideAddress
                    variant="short"
                    iconSize={16}
                    title={accountsNames[toAccountId(address)]}
                    accountId={toAccountId(address)}
                    chain={chain}
                  />
                </BodyText>
              </div>
              <BodyText className="col-span-2 px-2">{t(`governance.referendum.${vote.decision}`)}</BodyText>
              <div className="col-span-5 flex shrink-0 flex-col items-end gap-0.5 px-2">
                <AssetBalance value={vote.balance} asset={asset} />

                <FootnoteText>
                  <Trans
                    t={t}
                    i18nKey="general.actions.multiply"
                    values={{ multiplier: vote.conviction }}
                    components={{
                      balance: <AssetBalance className="text-footnote" value={vote.balance} asset={asset} />,
                    }}
                  />
                </FootnoteText>
              </div>
            </Fragment>
          ))}

          {referendum.votedByDelegates.map((delegate) => (
            <Fragment key={delegate.delegator}>
              <div className="col-span-5">
                <BodyText className="text-text-secondary">
                  {/* TODO: display delegated identity in subtitle */}
                  <Account
                    hideAddress
                    variant="short"
                    iconSize={16}
                    title={accountsNames[toAccountId(delegate.delegator)]}
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
