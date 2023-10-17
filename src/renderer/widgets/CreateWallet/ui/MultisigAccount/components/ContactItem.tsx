import { useAddressInfo } from '@renderer/entities/wallet/lib/useAddressInfo';
import { toAddress } from '@renderer/shared/lib/utils';
import { Icon, Identicon, BodyText, InfoPopover, HelpText } from '@renderer/shared/ui';
import { ExtendedContact } from '../common/types';
import type { Explorer } from '@renderer/shared/core';

type Props = Pick<ExtendedContact, 'accountId' | 'name'> & { explorers?: Explorer[] };

export const ContactItem = ({ accountId, name, explorers = [] }: Props) => {
  const address = toAddress(accountId);
  const popoverItems = useAddressInfo(address, explorers);

  return (
    <div className="flex items-center gap-x-2 w-full">
      <Identicon address={address} size={20} background={false} />

      <div className="flex flex-col max-w-[348px]">
        <BodyText className="tracking-tight">{name}</BodyText>
        <HelpText className="text-text-tertiary truncate">{address}</HelpText>
      </div>

      <InfoPopover data={popoverItems} containerClassName="ml-auto" position="right-0">
        <Icon name="info" size={16} className="hover:text-icon-hover" />
      </InfoPopover>
    </div>
  );
};
