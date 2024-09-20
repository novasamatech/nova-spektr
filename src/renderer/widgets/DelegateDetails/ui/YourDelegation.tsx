import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/app/providers';
import { toAddress } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, SmallTitleText, Tooltip } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { votingService } from '@/entities/governance';
import { AddressWithExplorers, accountUtils, walletModel } from '@/entities/wallet';
import { allTracks } from '@/features/governance';
import { delegationModel } from '@/widgets/DelegationModal/model/delegation-model';
import { editDelegationModel } from '@/widgets/EditDelegationModal';
import { revokeDelegationModel } from '@/widgets/RevokeDelegationModal';
import { delegateDetailsModel } from '../model/delegate-details-model';

export const YourDelegation = () => {
  const { t } = useI18n();

  const activeAccounts = useUnit(delegateDetailsModel.$activeAccounts);
  const uniqueTracks = useUnit(delegateDetailsModel.$uniqueTracks);
  const activeDelegations = useUnit(delegateDetailsModel.$activeDelegations);
  const chain = useUnit(delegateDetailsModel.$chain);
  const wallet = useUnit(walletModel.$activeWallet);

  const isAddAvailable = useUnit(delegateDetailsModel.$isAddAvailable);
  const isEditAvailable = useUnit(delegateDetailsModel.$isEditAvailable);
  const isViewAvailable = useUnit(delegateDetailsModel.$isViewAvailable);
  const isRevokeAvailable = useUnit(delegateDetailsModel.$isRevokeAvailable);
  const delegate = useUnit(delegateDetailsModel.$delegate);

  const accounts = wallet?.accounts.filter(
    (account) =>
      chain &&
      accountUtils.isChainAndCryptoMatch(account, chain) &&
      activeAccounts.includes(toAddress(account.accountId, { prefix: chain.addressPrefix })),
  );

  return (
    <div className="flex flex-col gap-6">
      <SmallTitleText>{t('governance.delegationDetails.yourDelegation')}</SmallTitleText>

      {activeAccounts.length > 0 && (
        <div className="flex flex-col gap-4">
          <DetailRow label={t('governance.addDelegation.accountsLabel', { count: activeAccounts.length })}>
            {activeAccounts.length === 1 ? (
              <AddressWithExplorers type="short" address={activeAccounts[0]} explorers={chain?.explorers} />
            ) : (
              <FootnoteText className="text-text-secondary">{activeAccounts.length}</FootnoteText>
            )}
          </DetailRow>

          <DetailRow label={t('governance.addDelegation.tracksLabel')}>
            <Tooltip
              content={uniqueTracks
                .map((trackId) => t(allTracks.find((track) => track.id === trackId)?.value || ''))
                .join(', ')}
              pointer="up"
            >
              <div className="flex gap-1">
                <FootnoteText>{uniqueTracks.length}</FootnoteText>

                <Icon className="group-hover:text-icon-hover" name="info" size={16} />
              </div>
            </Tooltip>
          </DetailRow>

          {activeAccounts.length === 1 && (
            <DetailRow label={t('governance.addDelegation.votesLabel')}>
              <FootnoteText>
                <Trans
                  t={t}
                  i18nKey="governance.addDelegation.votesValue"
                  components={{
                    votes: (
                      <AssetBalance
                        value={votingService.calculateVotingPower(
                          activeDelegations[activeAccounts[0]]?.balance,
                          activeDelegations[activeAccounts[0]]?.conviction,
                        )}
                        asset={chain?.assets[0]}
                        showSymbol={false}
                      />
                    ),
                  }}
                />
              </FootnoteText>
            </DetailRow>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {isAddAvailable && (
          <Button onClick={() => delegate && delegationModel.events.selectDelegate(delegate)}>
            {t('governance.addDelegation.addDelegationButton')}
          </Button>
        )}

        {isEditAvailable && accounts?.length === 1 && (
          <Button
            onClick={() => {
              if (delegate) {
                editDelegationModel.events.flowStarted({ delegate, accounts: [accounts[0]] });
              }
            }}
          >
            {t('governance.delegationDetails.editDelegationButton', { count: 1 })}
          </Button>
        )}

        {isRevokeAvailable && accounts?.length === 1 && (
          <Button
            pallet="secondary"
            onClick={() => {
              if (delegate) {
                revokeDelegationModel.events.flowStarted({ delegate: delegate.accountId, accounts: [accounts[0]] });
              }
            }}
          >
            {t('governance.addDelegation.revokeDelegationButton')}
          </Button>
        )}

        {isViewAvailable && (
          <Button pallet="secondary" onClick={() => delegateDetailsModel.events.openDelegations()}>
            {t('governance.addDelegation.viewDelegationButton')}
          </Button>
        )}
      </div>
    </div>
  );
};
