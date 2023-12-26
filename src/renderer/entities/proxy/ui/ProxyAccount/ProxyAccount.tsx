import { cnTw, toAddress, toShortAddress } from '@shared/lib/utils';
import { BodyText, DropdownIconButton, HelpText, Identicon, Truncate } from '@shared/ui';
import { AccountId } from '@shared/core';
import { ProxyType } from '../../lib/types';
import { ProxyTypeName } from '@entities/proxy/lib/constants';
import { useI18n } from '@app/providers';
import { DropdownIconButtonOption } from '@shared/ui/types';

type Props = {
  className?: string;
  type?: 'full' | 'short' | 'adaptive';
  name?: string;
  canCopy?: boolean;
  accountId: AccountId;
  addressPrefix?: number;
  proxyType: ProxyType;
  actions?: DropdownIconButtonOption[];
};

export const ProxyAccount = ({
  className,
  name,
  type = 'full',
  canCopy = true,
  accountId,
  addressPrefix,
  proxyType,
  actions,
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

  const ActionButton = actions && (
    <DropdownIconButton name="more" className="ml-2">
      <DropdownIconButton.Items>
        {actions.map((option) => (
          <DropdownIconButton.Item key={option.icon}>
            <DropdownIconButton.Option option={option} />
          </DropdownIconButton.Item>
        ))}
      </DropdownIconButton.Items>
    </DropdownIconButton>
  );

  return (
    <div className={cnTw('flex items-center gap-x-2', className)}>
      <Identicon className="inline-block" address={address} size={20} background={false} canCopy={canCopy} />
      <div className="grid gap-y-0.5">
        <BodyText className="text-text-secondary truncate">{name ?? addressContent}</BodyText>
        {name && <HelpText className="text-text-tertiary truncate">{addressContent}</HelpText>}
        <div className="flex gap-x-1 items-center mt-0.5">
          <span className="w-1 h-1 rounded-full bg-tab-text-accent" />
          <HelpText className="text-tab-text-accent">{t(ProxyTypeName[proxyType])}</HelpText>
        </div>
      </div>
      {ActionButton}
    </div>
  );
};
