import { Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import { WalletIcon } from '@entities/wallet';
import { BodyText, Identicon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { toAddress } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { WalletType, ProxyAction } from '@shared/core';
import { ProxyTypeOperation } from '../../lib/constants';
import { networkModel } from '@entities/network';

type Props = {
  notification: ProxyAction;
};

export const ProxyRemovedNotification = ({ notification }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);

  const address = toAddress(notification.proxyAccountId, { prefix: chains[notification.chainId].addressPrefix });

  return (
    <div className="flex gap-x-2">
      <div className="relative">
        <WalletIcon type={WalletType.PROXIED} />
        <div className="absolute top-[13px] -right-[1px] h-2 w-2 rounded-full bg-icon-negative border border-white" />
      </div>

      <div className="flex flex-col gap-y-2">
        <BodyText>{t('notifications.details.proxyRemovedTitle')}</BodyText>
        <BodyText className="inline-flex items-center">
          <Trans
            t={t}
            i18nKey="notifications.details.proxyWalletAction"
            values={{ address, name: notification.proxyWalletName }}
            components={{
              identicon: <Identicon className="mx-1" address={address} size={16} background={false} canCopy={true} />,
            }}
          />
        </BodyText>
        <BodyText className="inline-flex items-center">
          <Trans
            t={t}
            i18nKey="notifications.details.proxyRemovedDetails"
            values={{
              name: notification.proxiedWalletName,
              operations: t(ProxyTypeOperation[notification.proxyType]),
            }}
            components={{
              chain: <ChainTitle chainId={notification.chainId} fontClass="text-text-primary text-body" />,
              walletIcon: <WalletIcon size={16} type={notification.proxiedWalletType} className="mx-1" />,
            }}
          />
        </BodyText>
      </div>
    </div>
  );
};
