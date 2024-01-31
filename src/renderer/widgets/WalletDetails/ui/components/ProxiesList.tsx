import { useUnit } from 'effector-react';

import { cnTw } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { Accordion, ConfirmModal, FootnoteText, HelpText, SmallTitleText } from '@shared/ui';
import type { ProxyAccount } from '@shared/core';
import { networkModel } from '@entities/network';
import { AssetBalance } from '@entities/asset';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { ProxyAccountWithActions } from './ProxyAccountWithActions';
import { useToggle } from '@shared/lib/hooks';
import { RemoveProxy } from '@widgets/RemoveProxy';

type Props = {
  canCreateProxy?: boolean;
  className?: string;
};

export const ProxiesList = ({ className, canCreateProxy = true }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const chainsProxies = useUnit(walletProviderModel.$chainsProxies);
  const walletProxyGroups = useUnit(walletProviderModel.$walletProxyGroups);
  const proxyForRemoval = useUnit(walletProviderModel.$proxyForRemoval);

  const [isRemoveConfirmOpen, toggleIsRemoveConfirmOpen] = useToggle();
  const [isRemoveProxyOpen, toggleIsRemoveProxyOpen] = useToggle();

  const handleDeleteProxy = (proxyAccount: ProxyAccount) => {
    walletProviderModel.events.removeProxy(proxyAccount);
    toggleIsRemoveConfirmOpen();
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
        onConfirm={() => {
          toggleIsRemoveConfirmOpen();
          toggleIsRemoveProxyOpen();
        }}
      >
        <SmallTitleText align="center" className="mb-2">
          {t('walletDetails.common.confirmRemoveProxyTitle')}
        </SmallTitleText>
        <FootnoteText className="text-text-tertiary" align="center">
          {t('walletDetails.common.confirmRemoveProxyDescription')}
        </FootnoteText>
      </ConfirmModal>

      <RemoveProxy isOpen={isRemoveProxyOpen} proxyAccount={proxyForRemoval} onClose={toggleIsRemoveProxyOpen} />
    </div>
  );
};
