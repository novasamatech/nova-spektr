import { useStoreMap } from 'effector-react';
import { Trans } from 'react-i18next';

import { type ProxyAction, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { BodyText } from '@/shared/ui';
import { Identicon, WalletIcon } from '@/shared/ui-entities';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { ProxyTypeOperation, proxyUtils } from '@/entities/proxy';
import { walletModel, walletUtils } from '@/entities/wallet';

type Props = {
  notification: ProxyAction;
};

export const ProxyRemovedNotification = ({ notification }: Props) => {
  const { t } = useI18n();

  const chain = useStoreMap({
    store: networkModel.$chains,
    keys: [notification.chainId],
    fn: (chains, [id]) => chains[id] ?? null,
  });

  // Get proxy wallet from proxyAccountId
  const proxyWallet = useStoreMap({
    store: walletModel.$wallets,
    keys: [notification.proxyAccountId],
    fn: (wallets, [accountId]) => {
      return walletUtils.getWalletFilteredAccounts(wallets, {
        accountFn: (account) => account.accountId === accountId,
      });
    },
  });

  // Get proxied wallet from proxiedAccountId
  const proxiedWallet = useStoreMap({
    store: walletModel.$wallets,
    keys: [notification.proxiedAccountId],
    fn: (wallets, [accountId]) => {
      return walletUtils.getWalletFilteredAccounts(wallets, {
        accountFn: (account) => account.accountId === accountId,
      });
    },
  });

  const address = toAddress(notification.proxyAccountId, { prefix: chain?.addressPrefix });

  // Determine the proxied wallet name
  const proxiedWalletName =
    proxiedWallet?.name ||
    proxyUtils.getProxiedName(
      {
        accountId: notification.proxiedAccountId,
        proxyVariant: notification.proxyVariant,
        connections: [{ proxyAccountId: notification.proxyAccountId, proxyType: notification.proxyType, delay: 0 }],
      },
      chain?.addressPrefix,
    );

  const proxyWalletName = proxyWallet?.name || toAddress(notification.proxyAccountId, { prefix: chain?.addressPrefix });
  const proxyWalletType = proxyWallet?.type;
  const proxyAddress = toAddress(notification.proxyAccountId, { prefix: chain?.addressPrefix });

  return (
    <div className="flex gap-x-2">
      <div className="relative">
        <WalletIcon type={WalletType.PROXIED} />
        <div className="absolute top-[13px] -right-px h-2 w-2 rounded-full border border-white bg-icon-negative" />
      </div>

      <div className="flex flex-col gap-y-2">
        <BodyText>{t('notifications.details.proxyRemovedTitle')}</BodyText>
        <BodyText className="inline-flex flex-wrap items-center">
          <Trans
            t={t}
            i18nKey="notifications.details.proxyWalletAction"
            values={{ address, name: proxiedWalletName }}
            components={{
              identicon: (
                <div className="mx-1 inline-flex">
                  <Identicon address={address} size={16} background={false} canCopy={true} />
                </div>
              ),
              address: <p className="inline-flex" />,
            }}
          />
        </BodyText>
        <BodyText className="inline-flex flex-wrap items-center">
          <Trans
            t={t}
            i18nKey="notifications.details.proxyRemovedDetails"
            values={{
              name: proxyWalletName,
              operations: t(ProxyTypeOperation[notification.proxyType]),
            }}
            components={{
              chain: <ChainTitle chainId={notification.chainId} fontClass="text-text-primary text-body" />,
              walletIcon: (
                <span className="mx-1">
                  {proxyWalletType ? (
                    <WalletIcon size={16} type={proxyWalletType} />
                  ) : (
                    <Identicon address={proxyAddress} size={16} background={false} />
                  )}
                </span>
              ),
              wallet: <p className="inline-flex" />,
            }}
          />
        </BodyText>
      </div>
    </div>
  );
};
