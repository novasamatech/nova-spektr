import { useUnit } from 'effector-react';

import { type ProxiedAccount, type ProxyAccount, ProxyVariant, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { ConfirmModal, FootnoteText, HelpText, SmallTitleText } from '@/shared/ui';
import { Accordion } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { proxyRemoveFeature } from '@/features/proxy-remove';
import { proxyRemovePureFeature } from '@/features/proxy-remove-pure';
import { walletDetailsModel } from '../../model/wallet-details-model';

import { ProxyAccountWithActions } from './ProxyAccountWithActions';

const {
  models: { removeProxy },
  views: { RemoveProxy },
} = proxyRemoveFeature;

const {
  models: { removePureProxy },
  views: { RemovePureProxy },
} = proxyRemovePureFeature;

type Props = {
  wallet: Wallet;
  canCreateProxy?: boolean;
  className?: string;
};

export const ProxiesList = ({ className, wallet, canCreateProxy = true }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);

  const chainsProxies = useUnit(walletDetailsModel.$chainsProxies);
  const walletProxyGroups = useUnit(walletDetailsModel.$walletProxyGroups);
  const proxyForRemoval = useUnit(removeProxy.$proxyForRemoval);

  const [isRemoveConfirmOpen, toggleIsRemoveConfirmOpen] = useToggle();

  const handleDeleteProxy = (proxyAccount: ProxyAccount) => {
    const chainProxies = chainsProxies[proxyAccount.chainId] || [];
    const anyProxies = chainProxies.filter(proxy => proxy.proxyType === 'Any');
    const isPureProxy = (wallet?.accounts[0] as ProxiedAccount).proxyVariant === ProxyVariant.PURE;

    const shouldRemovePureProxy = isPureProxy && anyProxies.length === 1;

    if (shouldRemovePureProxy) {
      const account = wallet?.accounts.at(0);
      if (account) {
        removePureProxy.events.flowStarted({
          account: wallet?.accounts[0] as ProxiedAccount,
          proxy: proxyAccount,
        });
      }
    } else {
      removeProxy.events.removeProxy(proxyAccount);
      toggleIsRemoveConfirmOpen();
    }
  };

  const handleConfirm = () => {
    toggleIsRemoveConfirmOpen();

    if (!proxyForRemoval || !wallet) return;

    const account = wallet.accounts.find(a => {
      return (
        accountUtils.isNonBaseVaultAccount(a, wallet) &&
        accountUtils.isChainAndCryptoMatch(a, chains[proxyForRemoval.chainId])
      );
    });

    removeProxy.events.flowStarted({ account: account!, proxy: proxyForRemoval });
  };

  return (
    <div className={cnTw('flex flex-col', className)}>
      <div className="flex items-center px-5 py-2">
        <FootnoteText className="flex-1 px-2 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
      </div>

      <ul className="flex h-full flex-col divide-y divide-divider overflow-y-auto overflow-x-hidden px-5">
        {walletProxyGroups.map(({ chainId, totalDeposit }) => {
          if (!chainsProxies[chainId]?.length) {
            return null;
          }

          return (
            <li key={chainId} className="flex items-center py-2">
              <Accordion initialOpen>
                <Accordion.Trigger>
                  <div className="flex items-center justify-between gap-x-2 pr-2 normal-case">
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
                </Accordion.Trigger>
                <Accordion.Content>
                  <ul className="flex flex-col gap-y-2">
                    {chainsProxies[chainId].map(proxy => (
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

      <RemoveProxy wallet={wallet} />
      <RemovePureProxy wallet={wallet} />
    </div>
  );
};
