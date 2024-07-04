import { useUnit } from 'effector-react';

import { cnTw } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { Accordion, ConfirmModal, FootnoteText, HelpText, SmallTitleText } from '@shared/ui';
import { networkModel } from '@entities/network';
import { AssetBalance } from '@entities/asset';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { ProxyAccountWithActions } from './ProxyAccountWithActions';
import { useToggle } from '@shared/lib/hooks';
import { RemovePureProxy, removePureProxyModel } from '@widgets/RemovePureProxyModal';
import { RemoveProxy, removeProxyModel } from '@widgets/RemoveProxyModal';
import { accountUtils } from '@entities/wallet';
import { ProxiedAccount, ProxyAccount, ProxyType, ProxyVariant } from '@shared/core';
import { walletSelectModel } from '@features/wallets';

type Props = {
  canCreateProxy?: boolean;
  className?: string;
};

export const ProxiesList = ({ className, canCreateProxy = true }: Props) => {
  const { t } = useI18n();

  const wallet = useUnit(walletSelectModel.$walletForDetails);
  const chains = useUnit(networkModel.$chains);

  const chainsProxies = useUnit(walletProviderModel.$chainsProxies);
  const walletProxyGroups = useUnit(walletProviderModel.$walletProxyGroups);
  const proxyForRemoval = useUnit(walletProviderModel.$proxyForRemoval);

  const [isRemoveConfirmOpen, toggleIsRemoveConfirmOpen] = useToggle();

  const handleDeleteProxy = (proxyAccount: ProxyAccount) => {
    const chainProxies = chainsProxies[proxyAccount.chainId] || [];
    const anyProxies = chainProxies.filter((proxy) => proxy.proxyType === ProxyType.ANY);
    const isPureProxy = (wallet?.accounts[0] as ProxiedAccount).proxyVariant === ProxyVariant.PURE;

    const shouldRemovePureProxy = isPureProxy && anyProxies.length === 1;

    if (shouldRemovePureProxy) {
      removePureProxyModel.events.flowStarted({
        account: wallet?.accounts[0] as ProxiedAccount,
        proxy: proxyAccount,
      });
    } else {
      walletProviderModel.events.removeProxy(proxyAccount);
      toggleIsRemoveConfirmOpen();
    }
  };

  const handleConfirm = () => {
    toggleIsRemoveConfirmOpen();

    if (!proxyForRemoval || !wallet) return;

    const account = wallet.accounts.find((a) => {
      return (
        accountUtils.isNonBaseVaultAccount(a, wallet) &&
        accountUtils.isChainAndCryptoMatch(a, chains[proxyForRemoval.chainId])
      );
    });

    removeProxyModel.events.flowStarted({ account: account!, proxy: proxyForRemoval });
  };

  return (
    <div className={cnTw('flex flex-col', className)}>
      <div className="flex items-center px-5 pb-2">
        <FootnoteText className="flex-1 px-2 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
      </div>

      <ul className="flex flex-col h-full px-5 divide-y divide-divider overflow-y-auto overflow-x-hidden">
        {walletProxyGroups.map(({ chainId, totalDeposit }) => {
          if (!chainsProxies[chainId]?.length) return;

          return (
            <li key={chainId} className="flex items-center py-2">
              <Accordion isDefaultOpen>
                <Accordion.Button buttonClass="p-2 rounded hover:bg-action-background-hover focus:bg-action-background-hover">
                  <div className="flex gap-x-2 items-center justify-between pr-2">
                    <ChainTitle className="flex-1" fontClass="text-text-primary" chain={chains[chainId]} />
                    <HelpText className="text-text-tertiary">
                      {t('walletDetails.common.proxyDeposit')}
                      &nbsp;
                      <AssetBalance
                        value={totalDeposit.replaceAll(',', '')}
                        asset={chains[chainId].assets[0]}
                        showIcon={false}
                        className="text-help-text"
                      />
                    </HelpText>
                  </div>
                </Accordion.Button>
                <Accordion.Content>
                  <ul className="flex flex-col gap-y-2">
                    {chainsProxies[chainId].map((proxy) => (
                      <li className="px-2 py-1.5" key={`${proxy.id}_${proxy.proxyType}`}>
                        <ProxyAccountWithActions
                          account={proxy}
                          chain={chains[chainId]}
                          canCreateProxy={canCreateProxy}
                          onRemoveProxy={handleDeleteProxy}
                        />
                      </li>
                    ))}
                  </ul>
                </Accordion.Content>
              </Accordion>
            </li>
          );
        })}
      </ul>

      <ConfirmModal
        isOpen={isRemoveConfirmOpen}
        cancelText={t('walletDetails.common.confirmRemoveProxyCancel')}
        confirmText={t('walletDetails.common.confirmRemoveProxySubmit')}
        confirmPallet="error"
        panelClass="w-[240px]"
        onClose={toggleIsRemoveConfirmOpen}
        onConfirm={handleConfirm}
      >
        <SmallTitleText align="center" className="mb-2">
          {t('walletDetails.common.confirmRemoveProxyTitle')}
        </SmallTitleText>
        <FootnoteText className="text-text-tertiary" align="center">
          {t('walletDetails.common.confirmRemoveProxyDescription')}
        </FootnoteText>
      </ConfirmModal>

      <RemoveProxy />
      <RemovePureProxy />
    </div>
  );
};
