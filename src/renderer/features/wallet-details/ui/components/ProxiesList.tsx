import { useUnit } from 'effector-react';

import { type ChainId, type ProxiedAccount, type ProxyAccount, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { proxyRemoveFeature } from '@/features/proxy-remove';
import { walletProxiesModel } from '../../model/wallet-proxies-model';

import { ChainProxyGroup } from './ChainProxyGroup';
import { NoProxiesAction } from './NoProxiesAction';

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
  const chainsProxies = useUnit(walletProxiesModel.$walletProxies);
  const walletProxyGroups = useUnit(walletProxiesModel.$walletProxyGroups);
  const allAccounts = useUnit(accounts.$list);
  const isLoading = useUnit(walletProxiesModel.$isLoading);

  const handleDeleteProxy = (proxyAccount: Omit<ProxyAccount, 'id' | 'delay'>) => {
    const proxiedAccount = allAccounts.find(account => account.accountId === proxyAccount.proxiedAccountId);

    if (proxiedAccount) {
      removeProxyModel.flowStarted({
        proxied: proxiedAccount as ProxiedAccount,
        proxy: proxyAccount,
      });
    }
  };

  const renderProxyGroups = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    return walletProxyGroups
      .filter(({ chainId }) => {
        const typedChainId = chainId as ChainId;
        return chainsProxies[typedChainId]?.length > 0;
      })
      .map(({ chainId, totalDeposit }) => {
        const typedChainId = chainId as ChainId;
        const chain = chains[typedChainId];
        const proxies = chainsProxies[typedChainId] || [];

        return (
          <ChainProxyGroup
            key={chainId}
            chain={chain}
            proxies={proxies}
            totalDeposit={totalDeposit}
            canCreateProxy={canCreateProxy}
            onRemoveProxy={handleDeleteProxy}
          />
        );
      });
  };

  return (
    <div className={cnTw('flex flex-col', className)}>
      {isLoading ? (
        <>
          <div className="flex items-center px-5 py-2">
            <FootnoteText className="flex-1 px-2 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
          </div>

          <ul className="flex h-full flex-col divide-y divide-divider overflow-x-hidden overflow-y-auto px-5">
            {renderProxyGroups()}
          </ul>
        </>
      ) : hasProxies ? (
        <>
          <div className="flex items-center px-5 py-2">
            <FootnoteText className="flex-1 px-2 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
          </div>

          <ul className="flex h-full flex-col divide-y divide-divider overflow-x-hidden overflow-y-auto px-5">
            {renderProxyGroups()}
          </ul>
        </>
      ) : (
        <NoProxiesAction canCreateProxy={canCreateProxy} wallet={wallet} />
      )}

      <RemoveProxy wallet={wallet} />
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="flex items-center py-2">
    <Skeleton width="100%" height={10} />
  </div>
);
