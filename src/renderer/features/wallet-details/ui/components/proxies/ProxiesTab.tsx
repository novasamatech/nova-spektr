import { useUnit } from 'effector-react';
import { memo, useCallback } from 'react';

import { type ProxiedAccount, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { proxyRemoveFeature } from '@/features/proxy-remove';
import { proxyVerifyFeature } from '@/features/proxy-verify';
import { type WalletProxy, proxiesModel } from '../../../model/proxies-model';

import { ProxyRow } from './ProxyRow';

const {
  models: { removeProxyModel },
  views: { RemoveProxy },
} = proxyRemoveFeature;

const { VerifyProxy } = proxyVerifyFeature;

type Props = {
  wallet: Wallet;
  onCloseWalletDetails?: () => void;
};

export const ProxiesTab = memo(({ wallet, onCloseWalletDetails }: Props) => {
  const { t } = useI18n();
  const proxies = useUnit(proxiesModel.$proxies);
  const isLoading = useUnit(proxiesModel.$isLoading);
  const allAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chains);

  const handleRemove = useCallback(
    (proxy: WalletProxy) => {
      const chain = chains[proxy.chainId];
      if (!chain) return;

      const proxiedAccount = allAccounts.find(
        account =>
          account.accountId === proxy.pureProxyAccountId && accountService.isAccountAvailableOnChain(account, chain),
      );

      if (nullable(proxiedAccount)) return;

      removeProxyModel.flowStarted({
        proxied: proxiedAccount as ProxiedAccount,
        proxy: {
          accountId: proxy.proxyAccountId,
          chainId: proxy.chainId,
          proxiedAccountId: proxy.pureProxyAccountId,
          proxyType: proxy.proxyType,
        },
      });
    },
    [chains, allAccounts],
  );

  if (isLoading && proxies.length === 0) {
    return (
      <div className="px-5 py-6">
        <Skeleton width="100%" height={52} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {proxies.length === 0 ? (
        <div className="flex h-40 items-center justify-center px-5">
          <FootnoteText className="text-text-tertiary">{t('walletDetails.proxies.empty')}</FootnoteText>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-divider px-3">
          {proxies.map(proxy => {
            const verifyAction =
              proxy.status === 'not_verified' &&
              proxy.verifiable &&
              !proxy.pendingRemovalOperation &&
              !proxy.pendingVerificationOperation ? (
                <VerifyProxy wallet={wallet} proxy={proxy} />
              ) : null;

            return (
              <ProxyRow
                key={proxy.id}
                proxy={proxy}
                verifyAction={verifyAction}
                onRemove={handleRemove}
                onCloseWalletDetails={onCloseWalletDetails}
              />
            );
          })}
        </ul>
      )}

      <RemoveProxy wallet={wallet} />
    </div>
  );
});
