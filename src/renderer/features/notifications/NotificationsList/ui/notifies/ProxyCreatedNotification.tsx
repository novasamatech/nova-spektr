import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/app/providers';
import { type ProxyAction, ProxyVariant, WalletType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { BodyText, Identicon } from '@/shared/ui';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { WalletIcon } from '@/entities/wallet';
import { ProxyTypeOperation } from '../../lib/constants';

type Props = {
  notification: ProxyAction;
};

export const ProxyCreatedNotification = ({ notification }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);

  const accountId =
    notification.proxyVariant === ProxyVariant.PURE ? notification.proxiedAccountId : notification.proxyAccountId;

  const address = toAddress(accountId, { prefix: chains[notification.chainId]?.addressPrefix });

  return (
    <div className="flex gap-x-2">
      <div className="relative">
        <WalletIcon type={WalletType.PROXIED} />
        <div className="absolute -right-[1px] top-[13px] h-2 w-2 rounded-full border border-white bg-icon-positive" />
      </div>

      <div className="flex flex-col gap-y-2">
        <BodyText>{t('notifications.details.proxyCreatedTitle')}</BodyText>
        <BodyText className="inline-flex flex-wrap items-center gap-y-2">
          <Trans
            t={t}
            i18nKey="notifications.details.proxyWalletAction"
            values={{ address, name: notification.proxiedWalletName }}
            components={{
              identicon: (
                <Identicon className="mx-1 inline-flex" address={address} size={16} background={false} canCopy={true} />
              ),
              address: <p className="inline-flex" />,
            }}
          />
        </BodyText>
        <BodyText className="inline-flex flex-wrap items-center gap-y-2">
          <Trans
            t={t}
            i18nKey="notifications.details.proxyCreatedDetails"
            values={{
              name: notification.proxyWalletName,
              operations: t(ProxyTypeOperation[notification.proxyType]),
            }}
            components={{
              chain: <ChainTitle chainId={notification.chainId} fontClass="text-text-primary text-body" />,
              walletIcon: <WalletIcon size={16} type={notification.proxyWalletType} className="mx-1" />,
              wallet: <p className="inline-flex" />,
            }}
          />
        </BodyText>
      </div>
    </div>
  );
};
