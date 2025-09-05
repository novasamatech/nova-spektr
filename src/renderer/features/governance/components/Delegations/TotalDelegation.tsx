import { useUnit } from 'effector-react';
import { type ReactNode, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { useConfirmContext } from '@/shared/providers';
import { FootnoteText, Icon, Plate, SmallTitleText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { AssetFiatBalance } from '@/entities/price';
import { walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { EmptyAccountMessage } from '@/features/emptyList';
import { WalletDetails } from '@/features/wallet-details';
import { delegationAggregate } from '../../aggregates/delegation';

type Props = {
  onClick: () => void;
};

export const TotalDelegation = ({ onClick }: Props) => {
  const { t } = useI18n();
  const { confirm } = useConfirmContext();

  const network = useUnit(delegationAggregate.$network);
  const isLoading = useUnit(delegationAggregate.$isLoading);
  const hasAccount = useUnit(delegationAggregate.$hasAccount);
  const canDelegate = useUnit(delegationAggregate.$canDelegate);
  const delegatedVotingPower = useUnit(delegationAggregate.$delegatedVotingPower);

  const activeWallet = useUnit(walletSelect.$selectedWallet);

  const [showWalletDetails, setShowWalletDetails] = useState(false);

  const delegatedVotingPowerString = delegatedVotingPower.toString();

  const handleClick = () => {
    if (hasAccount && canDelegate) {
      onClick();

      return;
    }

    let message: ReactNode = <EmptyAccountMessage walletType={activeWallet?.type} />;

    if (hasAccount && !canDelegate) {
      if (walletUtils.isWatchOnly(activeWallet)) {
        message = t('governance.addDelegation.walletTypeRestrictionError');
      } else {
        message = (
          <>
            {t('emptyState.accountDescription')} {t('governance.addDelegation.proxyRestrictionMessage')}
          </>
        );
      }
    }

    confirm({
      title: t('governance.addDelegation.cantAddDelegationTitle'),
      message,
      cancelText: t('general.button.closeButton'),
      confirmText: walletUtils.isPolkadotVault(activeWallet) ? t('emptyState.addAccountButton') : undefined,
    }).then((result) => {
      if (result && activeWallet) {
        setShowWalletDetails(true);
      }
    });
  };

  return (
    <>
      <button onClick={handleClick}>
        <Plate className="flex h-[90px] w-[240px] items-center justify-between px-4 pt-3 pb-4.5">
          <div className="flex flex-col items-start gap-y-2">
            <div className="flex items-center gap-x-1">
              <Icon size={16} name="opengovDelegations" />
              <FootnoteText>{t('governance.delegations.label')}</FootnoteText>
            </div>

            {isLoading || (nullable(network) && <Skeleton width={30} height={5} />)}

            {!isLoading && nonNullable(network) && delegatedVotingPower.isZero() && (
              <SmallTitleText>{t('governance.addDelegation.actionButton')}</SmallTitleText>
            )}

            {!isLoading && nonNullable(network) && !delegatedVotingPower.isZero() && (
              <div className="flex flex-col gap-y-0.5">
                <AssetBalance className="text-small-title" value={delegatedVotingPowerString} asset={network.asset} />
                <AssetFiatBalance amount={delegatedVotingPowerString} asset={network.asset} />
              </div>
            )}
          </div>

          <Icon name="arrowRight" />
        </Plate>
      </button>

      <WalletDetails
        isOpen={showWalletDetails}
        wallet={activeWallet ?? null}
        onClose={() => setShowWalletDetails(false)}
      />
    </>
  );
};
