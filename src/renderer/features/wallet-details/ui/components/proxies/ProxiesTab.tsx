import { useUnit } from 'effector-react';
import { memo, useCallback } from 'react';

import { type ProxiedAccount, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button, FootnoteText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { ChangeSignatories } from '@/features/flexible-change-signatories';
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
  const allWallets = useUnit(walletModel.$wallets);
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
      <div className="flex flex-col gap-2 px-5 py-6">
        <Skeleton width="100%" height={52} />
        <Skeleton width="100%" height={52} />
        <Skeleton width="100%" height={52} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {proxies.length === 0 && !isLoading ? (
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

            // Edit lets the user change signatories of a flex multisig. We surface it on
            // any multisig proxy row whose pure-proxy is the pure-proxy of a flex multisig
            // wallet — i.e. "multisigs that point to a flexible multisig". This covers
            // every multisig that has proxy authority over the flex's pure proxy, not just
            // the current controller, so a stale ex-controller row still gets the action.
            const isMultisigDelegate = proxy.proxyMultisigAccountId !== null;
            const flexForPureProxy = walletUtils.getWalletFilteredAccounts(allWallets, {
              walletFn: walletUtils.isFlexibleMultisig,
              accountFn: account =>
                accountUtils.isFlexibleMultisigAccount(account) &&
                account.accountId === proxy.pureProxyAccountId &&
                account.chainId === proxy.chainId,
            });
            const editableProxyWallet = isMultisigDelegate ? flexForPureProxy : null;

            // We deliberately don't gate edit on `pendingVerificationOperation` —
            // editing signatories spawns a fresh add-proxy + remarkWithEvent flow
            // that's independent of any in-flight verify op, and gating on it
            // hides the action on rows where a verify proposal happens to be
            // queued (often the case after a recent change-signatories run).
            const editAction =
              editableProxyWallet &&
              (proxy.status === 'verified' || proxy.status === 'not_verified') &&
              !proxy.pendingRemovalOperation ? (
                <ChangeSignatories
                  wallet={editableProxyWallet}
                  currentControllerAccountId={proxy.proxyMultisigAccountId}
                >
                  <Button size="sm" variant="fill" pallet="secondary">
                    {t('flexibleMultisig.editProxy.editButton')}
                  </Button>
                </ChangeSignatories>
              ) : null;

            return (
              <ProxyRow
                key={proxy.id}
                proxy={proxy}
                verifyAction={verifyAction}
                editAction={editAction}
                onRemove={handleRemove}
                onCloseWalletDetails={onCloseWalletDetails}
              />
            );
          })}
          {isLoading && (
            <li className="px-2 py-3">
              <Skeleton width="100%" height={52} />
            </li>
          )}
        </ul>
      )}

      <RemoveProxy wallet={wallet} />
    </div>
  );
});
