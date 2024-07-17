import { type ReactNode } from 'react';

import { useI18n } from '@app/providers';
import { type AccountId, type ProxyType } from '@shared/core';
import { cnTw, toAddress, toShortAddress } from '@shared/lib/utils';
import { BodyText, HelpText, Identicon, Truncate } from '@shared/ui';
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
      <Identicon className="inline-block" address={address} size={20} background={false} canCopy={canCopy} />
      <div className="grid gap-y-0.5">
        <BodyText className="text-text-secondary truncate">{name ?? addressContent}</BodyText>
        {name && <HelpText className="text-text-tertiary truncate">{addressContent}</HelpText>}
        <div className="flex gap-x-1 items-center mt-0.5">
          <span className="w-1 h-1 rounded-full bg-tab-text-accent" />
          <HelpText className="text-tab-text-accent">{t(proxyUtils.getProxyTypeName(proxyType))}</HelpText>
        </div>
      </div>
      {suffix}
    </div>
  );
};
