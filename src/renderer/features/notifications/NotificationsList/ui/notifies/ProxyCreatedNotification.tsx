import { Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import { WalletIcon, walletModel } from '@entities/wallet';
import { BodyText, Identicon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { toAddress } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { WalletType, ProxyCreated } from '@shared/core';
import { ProxyTypeOperation } from '../../lib/constants';

type Props = {
  notification: ProxyCreated;
};

export const ProxyCreatedNotification = ({ notification }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$accounts);

  const proxyAccount = accounts.find((a) => a.accountId === notification.proxyAccountId);
  const proxyWallet = wallets.find((w) => w.id === proxyAccount?.walletId);
  const proxiedAccount = accounts.find((a) => a.accountId === notification.proxiedAccountId);
  const proxiedWallet = wallets.find((w) => w.id === proxiedAccount?.walletId);

  if (!proxiedWallet) return null;

  const identicon = (
    <Identicon
      className="mx-1"
      address={toAddress(proxyAccount?.accountId!)}
      size={16}
      background={false}
      canCopy={true}
    />
  );

  const chain = <ChainTitle chainId={notification.chainId} fontClass="text-text-primary text-body" />;

  const walletIcon = <WalletIcon size={16} type={proxiedWallet.type} className="mx-1" />;

  return (
    <div className="flex gap-x-2">
      <WalletIcon type={WalletType.PROXIED} />
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
              operations: t(ProxyTypeOperation[notification.proxyType]),
            }}
            components={{ chain, walletIcon }}
          />
        </BodyText>
      </div>
    </div>
  );
};
