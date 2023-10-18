import { useAddressInfo } from '@renderer/entities/wallet/lib/useAddressInfo';
import { cnTw, toAddress } from '@renderer/shared/lib/utils';
import { Icon, Identicon, BodyText, InfoPopover, HelpText } from '@renderer/shared/ui';
import { ExtendedContact } from '../common/types';
import type { Explorer } from '@renderer/shared/core';

type Props = Pick<ExtendedContact, 'accountId' | 'name'> & { explorers?: Explorer[]; disabled?: boolean };

export const ContactItem = ({ accountId, name, explorers = [], disabled }: Props) => {
  const address = toAddress(accountId);
  const popoverItems = useAddressInfo(address, explorers);

  return (
    <div className="flex items-center gap-x-2 w-full">
      <Identicon address={address} size={20} background={false} className={cnTw(disabled && 'opacity-60')} />

      <div className="flex flex-col max-w-[348px]">
        <BodyText className={cnTw('tracking-tight', disabled ? 'text-text-secondary' : 'text-text-primary')}>
          {name}
        </BodyText>
        <HelpText className="text-text-tertiary truncate">{address}</HelpText>
      </div>

      <InfoPopover data={popoverItems} containerClassName="ml-auto" position="right-0">
        <Icon name="info" size={16} className="hover:text-icon-hover" />
      </InfoPopover>
    </div>
  );
};
