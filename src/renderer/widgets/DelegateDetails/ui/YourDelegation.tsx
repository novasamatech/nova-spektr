import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { allTracks, locksService } from '@/entities/governance';
import { delegationModel } from '@/widgets/DelegationModal';
import { editDelegationModel } from '@/widgets/EditDelegationModal';
import { revokeDelegationModel } from '@/widgets/RevokeDelegationModal';
import { delegateDetailsModel } from '../model/delegate-details-model';

export const YourDelegation = () => {
  const { t } = useI18n();

  const activeAccounts = useUnit(delegateDetailsModel.$activeAccounts);
  const uniqueTracks = useUnit(delegateDetailsModel.$uniqueTracks);
  const activeDelegations = useUnit(delegateDetailsModel.$activeDelegations);
  const chain = useUnit(delegateDetailsModel.$chain);

  const isAddAvailable = useUnit(delegateDetailsModel.$isAddAvailable);
  const isEditAvailable = useUnit(delegateDetailsModel.$isEditAvailable);
  const isViewAvailable = useUnit(delegateDetailsModel.$isViewAvailable);
  const isRevokeAvailable = useUnit(delegateDetailsModel.$isRevokeAvailable);
  const delegate = useUnit(delegateDetailsModel.$delegate);
  const initiators = useUnit(delegateDetailsModel.$initiators);

  if (nullable(chain)) {
    return null;
  }

  const accounts =
    initiators.filter((account) => {
      return activeAccounts.includes(account.accountId);
    }) || [];

  return (
    <div className="flex flex-col gap-6">
      <SmallTitleText>{t('governance.delegationDetails.yourDelegation')}</SmallTitleText>

      {activeAccounts.length > 0 && (
        <div className="flex flex-col gap-4">
          <DetailRow label={t('governance.addDelegation.accountsLabel', { count: activeAccounts.length })}>
            {accounts.length === 1 ? (
              <div className="overflow-hidden text-text-secondary">
                <Account accountId={accounts?.[0].accountId} chain={chain} variant="short" />
              </div>
            ) : (
              <FootnoteText className="text-text-secondary">{accounts.length}</FootnoteText>
            )}
          </DetailRow>

          <DetailRow label={t('governance.addDelegation.tracksLabel')}>
            <Tooltip side="bottom">
              <Tooltip.Trigger>
                <div className="flex gap-1">
                  <FootnoteText>{uniqueTracks.length}</FootnoteText>

                  <Icon className="group-hover:text-icon-hover" name="info" size={16} />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>
                {uniqueTracks
                  .map((trackId) => t(allTracks.find((track) => track.id === trackId)?.value || ''))
                  .join(', ')}
              </Tooltip.Content>
            </Tooltip>
          </DetailRow>

          {activeAccounts.length === 1 && (
            <DetailRow wrapperClassName="items-start" label={t('governance.addDelegation.lockedLabel')}>
              <FootnoteText>
                <Trans
                  t={t}
                  i18nKey="general.actions.duration"
                  values={{
                    duration: locksService.getLockPeriodsMultiplier(activeDelegations[activeAccounts[0]]?.conviction),
                  }}
                  components={{
                    balance: (
                      <AssetBalance
                        className="text-footnote"
                        value={activeDelegations[activeAccounts[0]]?.balance}
                        asset={chain?.assets[0]}
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

        {isEditAvailable && accounts.length === 1 && (
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

        {isRevokeAvailable && accounts.length === 1 && (
          <Button
            pallet="secondary"
            onClick={() => {
              if (delegate) {
                revokeDelegationModel.flowStarted({ delegate: delegate.accountId, accounts: [accounts[0]] });
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
