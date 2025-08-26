import { type ReactNode } from 'react';

import { type ProxyType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, HelpText, Truncate } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { proxyUtils } from '../../lib/proxy-utils';

type Props = {
  className?: string;
  type?: 'full' | 'short' | 'adaptive';
  name?: string;
  canCopy?: boolean;
  accountId: AccountId;
  addressPrefix?: number;
  proxyType: ProxyType;
  suffix?: ReactNode;
};

export const ProxyAccount = ({
  className,
  name,
  type = 'full',
  canCopy = true,
  accountId,
  addressPrefix,
  proxyType,
  suffix,
}: Props) => {
  const { t } = useI18n();
  const address = toAddress(accountId, { prefix: addressPrefix });
  const typeIsAdaptive = type === 'adaptive';
  const addressToShow = type === 'short' ? toShortAddress(address, 8) : address;

  const addressContent = typeIsAdaptive ? (
    <Truncate className="text-inherit" ellipsis="..." start={4} end={4} text={addressToShow} />
  ) : (
    addressToShow
  );

  return (
    <div className={cnTw('flex items-center gap-x-2', className)}>
      <Identicon value={address} size={20} background={false} canCopy={canCopy} />
      <div className="grid gap-y-0.5">
        <BodyText className="truncate text-text-secondary">{name ?? addressContent}</BodyText>
        {name && <HelpText className="truncate text-text-tertiary">{addressContent}</HelpText>}
        <div className="mt-0.5 flex items-center gap-x-1">
          <span className="h-1 w-1 rounded-full bg-tab-text-accent" />
          <HelpText className="text-tab-text-accent">{t(proxyUtils.getProxyTypeName(proxyType))}</HelpText>
        </div>
      </div>
      <div className="ml-auto">{suffix}</div>
    </div>
  );
};
