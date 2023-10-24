import { useAddressInfo } from '@renderer/entities/wallet/lib/useAddressInfo';
import { cnTw, toAddress } from '@renderer/shared/lib/utils';
import { Icon, Identicon, BodyText, InfoPopover, HelpText } from '@renderer/shared/ui';
import type { Explorer, AccountId } from '@renderer/shared/core';

type Props = {
  name?: string;
  size?: number;
  accountId: AccountId;
  explorers?: Explorer[];
  addressPrefix?: number;
  disabled?: boolean;
  className?: string;
  addressFont?: string;
};
export const ContactItem = ({
  accountId,
  name,
  size = 20,
  explorers = [],
  addressPrefix,
  disabled,
  className,
  addressFont,
}: Props) => {
  const address = toAddress(accountId, { prefix: addressPrefix });
  const popoverItems = useAddressInfo({ address, explorers, addressPrefix });

  return (
    <div className={cnTw('flex items-center gap-x-2 w-full', className)}>
      <Identicon address={address} size={size} background={false} className={cnTw(disabled && 'opacity-60')} />

      <div className="flex flex-col max-w-[348px]">
        {name && (
          <BodyText className={cnTw('tracking-tight', addressFont, disabled && 'text-text-secondary')}>{name}</BodyText>
        )}
        <HelpText className="text-text-tertiary truncate">{address}</HelpText>
      </div>

      <InfoPopover data={popoverItems} containerClassName="ml-auto" position="right-0">
        <Icon name="info" size={16} className="hover:text-icon-hover" />
      </InfoPopover>
    </div>
  );
};
