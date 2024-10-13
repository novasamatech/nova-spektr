import { useStoreMap } from 'effector-react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/app/providers';
import { type ProxyAction, WalletType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { BodyText, Identicon } from '@/shared/ui';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { WalletIcon } from '@/entities/wallet';
import { ProxyTypeOperation } from '../../lib/constants';

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

  const address = toAddress(notification.proxyAccountId, { prefix: chain?.addressPrefix });

  return (
    <div className="flex gap-x-2">
      <div className="relative">
        <WalletIcon type={WalletType.PROXIED} />
        <div className="absolute -right-[1px] top-[13px] h-2 w-2 rounded-full border border-white bg-icon-negative" />
      </div>

      <div className="flex flex-col gap-y-2">
        <BodyText>{t('notifications.details.proxyRemovedTitle')}</BodyText>
        <BodyText className="inline-flex flex-wrap items-center">
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
        <BodyText className="inline-flex flex-wrap items-center">
          <Trans
            t={t}
            i18nKey="notifications.details.proxyRemovedDetails"
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
