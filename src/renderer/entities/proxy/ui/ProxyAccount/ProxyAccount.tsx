import { cnTw, toAddress, toShortAddress } from '@shared/lib/utils';
import { BodyText, HelpText, Identicon, Truncate } from '@shared/ui';
import { AccountId } from '@shared/core';
import { ProxyType } from '../../lib/types';
import { ProxyTypeName } from '@entities/proxy/lib/constants';
import { useI18n } from '@app/providers';

type Props = {
  className?: string;
  type?: 'full' | 'short' | 'adaptive';
  name?: string;
  canCopy?: boolean;
  accountId: AccountId;
  addressPrefix?: number;
  proxyType: ProxyType;
};

export const ProxyAccount = ({
  className,
  name,
  type = 'full',
  canCopy = true,
  accountId,
  addressPrefix,
  proxyType,
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
        <BodyText className="text-text-secondary truncate">{name ? name : addressContent}</BodyText>
        {name && <HelpText className="text-text-tertiary truncate">{addressContent}</HelpText>}
        <div className="flex gap-x-1 items-center mt-0.5">
          <span className="w-1 h-1 rounded-full bg-tab-text-accent" />
          <HelpText className="text-tab-text-accent">{t(ProxyTypeName[proxyType])}</HelpText>
        </div>
      </div>
    </div>
  );
};
