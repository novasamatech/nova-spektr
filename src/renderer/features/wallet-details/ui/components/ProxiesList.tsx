import { useStoreMap, useUnit } from 'effector-react';

import { type ProxyAccount, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, HelpText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Accordion } from '@/shared/ui-kit';
import { accountService, accounts } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { proxyRemoveFeature } from '@/features/proxy-remove';
import { walletDetailsModel } from '../../model/wallet-details-model';

import { NoProxiesAction } from './NoProxiesAction';
import { ProxyAccountWithActions } from './ProxyAccountWithActions';

const {
  models: { removeProxyModel },
  views: { RemoveProxy },
} = proxyRemoveFeature;

type Props = {
  wallet: Wallet;
  hasProxies: boolean;
  canCreateProxy?: boolean;
  className?: string;
};

export const ProxiesList = ({ className, wallet, hasProxies, canCreateProxy = true }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);

  const chainsProxies = useUnit(walletDetailsModel.$chainsProxies);
  const walletProxyGroups = useUnit(walletDetailsModel.$walletProxyGroups);

  const walletAccounts = useStoreMap({
    store: accounts.$list,
    keys: [wallet],
    fn: (accounts, [wallet]) => {
      return accountService.filterAccountsByWallet(accounts, wallet.id);
    },
  });

  const handleDeleteProxy = (proxyAccount: ProxyAccount) => {
    const proxiedAccount = walletAccounts.find(account => accountUtils.isProxiedAccount(account));

    if (proxiedAccount) {
      removeProxyModel.flowStarted({
        proxied: proxiedAccount,
        proxy: proxyAccount,
      });
    }
  };

  return (
    <div className={cnTw('flex flex-col', className)}>
      {hasProxies ? (
        <>
          <div className="flex items-center px-5 py-2">
            <FootnoteText className="flex-1 px-2 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
          </div>

          <ul className="flex h-full flex-col divide-y divide-divider overflow-x-hidden overflow-y-auto px-5">
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
                            className="text-help-text"
                          />
                        </HelpText>
                      </div>
                    </Accordion.Trigger>
                    <Accordion.Content>
                      <ul className="flex flex-col gap-y-2">
                        {chainsProxies[chainId].map(proxy => (
                          <li className="px-2 py-1.5" key={`${proxy.accountId}_${proxy.proxyType}_${proxy.chainId}`}>
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
        </>
      ) : (
        <NoProxiesAction canCreateProxy={canCreateProxy} wallet={wallet} />
      )}

      <RemoveProxy wallet={wallet} />
    </div>
  );
};
