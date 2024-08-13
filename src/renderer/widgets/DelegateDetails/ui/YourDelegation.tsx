import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/app/providers';
import { Button, DetailRow, FootnoteText, Icon, SmallTitleText, Tooltip } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { votingService } from '@/entities/governance';
import { AddressWithExplorers } from '@/entities/wallet';
import { allTracks } from '@/widgets/DelegateModal/lib/constants';
import { delegationModel } from '@/widgets/DelegationModal/model/delegation-model';
import { delegateDetailsModel } from '../model/delegate-details-model';

export const YourDelegation = () => {
  const { t } = useI18n();

  const activeAccounts = useUnit(delegateDetailsModel.$activeAccounts);
  const uniqueTracks = useUnit(delegateDetailsModel.$uniqueTracks);
  const activeDelegations = useUnit(delegateDetailsModel.$activeDelegations);
  const chain = useUnit(delegateDetailsModel.$chain);

  const isAddAvailable = useUnit(delegateDetailsModel.$isAddAvailable);
  const isViewAvailable = useUnit(delegateDetailsModel.$isViewAvailable);
  const delegate = useUnit(delegateDetailsModel.$delegate);

  return (
    <div className="flex flex-col gap-6">
      <SmallTitleText>{t('governance.addDelegation.yourDelegation')}</SmallTitleText>

      {activeAccounts.length > 0 && (
        <div className="flex flex-col gap-4">
          <DetailRow label={t('governance.addDelegation.accountsLabel', { count: activeAccounts.length })}>
            {activeAccounts.length === 1 ? (
              <AddressWithExplorers type="short" address={activeAccounts[0]} explorers={chain?.explorers} />
            ) : (
              activeAccounts.length
            )}
          </DetailRow>

          <DetailRow label={t('governance.addDelegation.tracksLabel')}>
            <Tooltip
              content={uniqueTracks
                .map((trackId) => t(allTracks.find((track) => track.id === trackId)!.value))
                .join(', ')}
              pointer="up"
            >
              <div className="flex gap-1">
                <FootnoteText>{uniqueTracks.length}</FootnoteText>

                <Icon className="group-hover:text-icon-hover" name="info" size={16} />
              </div>
            </Tooltip>
          </DetailRow>

          <DetailRow label={t('governance.addDelegation.votesLabel')}>
            <FootnoteText>
              <Trans
                t={t}
                i18nKey="governance.addDelegation.votesValue"
                components={{
                  votes: (
                    <AssetBalance
                      value={activeDelegations[activeAccounts[0]]?.balance
                        .mul(
                          new BN(
                            votingService.getConvictionMultiplier(activeDelegations[activeAccounts[0]]?.conviction),
                          ),
                        )
                        .toString()}
                      asset={chain?.assets[0]}
                      showSymbol={false}
                    />
                  ),
                }}
              />
            </FootnoteText>
          </DetailRow>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {isAddAvailable && (
          <Button onClick={() => delegate && delegationModel.events.selectDelegate(delegate)}>
            {t('governance.addDelegation.addDelegationButton')}
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
