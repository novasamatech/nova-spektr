import { useMemo } from 'react';
import { Trans } from 'react-i18next';

import { type Chain, type ChainId, type ProxyAction, type Wallet, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { BodyText } from '@/shared/ui';
import { Identicon, WalletIcon } from '@/shared/ui-entities';
import { ChainTitle } from '@/entities/chain';
import { ProxyTypeOperation, proxyUtils } from '@/entities/proxy';
import { walletUtils } from '@/entities/wallet';

type Props = {
  notification: ProxyAction;
  chains: Record<ChainId, Chain>;
  wallets: Wallet[];
};

export const ProxyRemovedNotification = ({ notification, chains, wallets }: Props) => {
  const { t } = useI18n();

  const chain = chains[notification.chainId] ?? null;

  const proxyWallet = useMemo(() => {
    return walletUtils.getWalletFilteredAccounts(wallets, {
      accountFn: (account) => account.accountId === notification.proxyAccountId,
    });
  }, [wallets, notification.proxyAccountId]);

  const proxiedWallet = useMemo(() => {
    return walletUtils.getWalletFilteredAccounts(wallets, {
      accountFn: (account) => account.accountId === notification.proxiedAccountId,
    });
  }, [wallets, notification.proxiedAccountId]);

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

  const proxyTypeTranslation = ProxyTypeOperation[notification.proxyType];

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
              operations: proxyTypeTranslation ? t(proxyTypeTranslation) : notification.proxyType,
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
