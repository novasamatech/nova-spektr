import { Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import {
  MultisigAccountInvitedNotification,
  MultisigNotification,
  MultisigNotificationType,
  Notification,
  ProxyCreatedNotification,
  ProxyNotificationType,
} from '@entities/notification';
import { WalletType } from '@shared/core';
import { WalletIcon, walletModel } from '@entities/wallet';
import { BodyText, Identicon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { toAddress } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { ProxyTypeOperations } from '@entities/proxy';

type Props = {
  notification: Notification;
};

export const NotificationBody = ({ notification }: Props) => {
  const { t } = useI18n();
  const { type } = notification;

  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$accounts);

  const notificationProvider = {
    [MultisigNotificationType.ACCOUNT_INVITED]: (n: Notification) => {
      const typedNotification = n as Notification & MultisigNotification & MultisigAccountInvitedNotification;
      const multisigAccount = accounts.find((a) => a.accountId === typedNotification.multisigAccountId);
      const notificationWallet = wallets.find((w) => w.id === multisigAccount?.walletId);

      return (
        <div className="flex gap-x-2">
          <WalletIcon type={WalletType.MULTISIG} />
          <div className="flex flex-col gap-y-2">
            <BodyText>{t('notifications.details.newMultisigAccountTitle')}</BodyText>
            <BodyText className="inline-flex">
              <Trans
                t={t}
                i18nKey="notifications.details.newMultisigAccountDescription"
                values={{
                  threshold: typedNotification.threshold,
                  signatories: typedNotification.signatories.length,
                  name: notificationWallet?.name || typedNotification.multisigAccountName,
                }}
              />
            </BodyText>
          </div>
        </div>
      );
    },
    [MultisigNotificationType.MST_CREATED]: () => <></>,
    [MultisigNotificationType.MST_APPROVED]: () => <></>,
    [MultisigNotificationType.MST_EXECUTED]: () => <></>,
    [MultisigNotificationType.MST_CANCELLED]: () => <></>,
    [ProxyNotificationType.PROXY_CREATED]: (n: Notification) => {
      const typedNotification = n as Notification & ProxyCreatedNotification;
      const proxyAccount = accounts.find((a) => a.accountId === typedNotification.proxyAccountId);
      // const proxyWallet = wallets.find((w) => w.id === proxyAccount?.walletId);
      const proxyWallet = {
        name: 'Staking for 1234...5678',
      };
      const proxiedAccount = accounts.find((a) => a.accountId === typedNotification.proxiedAccountId);
      const proxiedWallet = wallets.find((w) => w.id === proxiedAccount?.walletId);

      const identicon = (
        <Identicon
          className="mx-1"
          address={toAddress(proxyAccount?.accountId!)}
          size={16}
          background={false}
          canCopy={true}
        />
      );

      const chain = <ChainTitle chainId={typedNotification.chainId} fontClass="text-text-primary text-body" />;

      const walletIcon = <WalletIcon size={16} type={proxiedWallet?.type!} className="mx-1" />;

      return (
        <div className="flex gap-x-2">
          <WalletIcon type={WalletType.PROXY} />
          <div className="flex flex-col gap-y-2">
            <BodyText>{t('notifications.details.proxyCreatedTitle')}</BodyText>
            <BodyText className="inline-flex items-center">
              <Trans
                t={t}
                i18nKey="notifications.details.proxyCreatedWallet"
                values={{
                  address: toAddress(proxyAccount?.accountId!),
                  name: proxyWallet?.name,
                }}
                components={{ identicon }}
              />
            </BodyText>
            <BodyText className="inline-flex items-center">
              <Trans
                t={t}
                i18nKey="notifications.details.proxyCreatedDetails"
                values={{
                  name: proxiedWallet?.name,
                  operations: t(ProxyTypeOperations[typedNotification.proxyType]),
                }}
                components={{ chain, walletIcon }}
              />
            </BodyText>
          </div>
        </div>
      );
    },
  };

  return notificationProvider[type](notification);
};
