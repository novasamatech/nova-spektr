import { InfoPopover, Icon } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { AccountAddressProps, AccountAddress, getAddress } from '../AccountAddress/AccountAddress';
import { useAddressInfo } from '../../lib/useAddressInfo';
import type { Explorer } from '@shared/core';

type Props = {
  showMatrix?: boolean;
  explorers?: Explorer[];
  position?: string;
  wrapperClassName?: string;
} & AccountAddressProps;

export const AddressWithExplorers = ({
  explorers = [],
  showMatrix,
  position,
  wrapperClassName,
  ...addressProps
}: Props) => {
  const address = getAddress(addressProps);
  const popoverItems = useAddressInfo({ address, explorers, showMatrix });

  return (
    <InfoPopover data={popoverItems} position={position} className="w-[230px]">
      <div
        className={cnTw(
          'flex max-w-full items-center gap-x-1 cursor-pointer group hover:bg-action-background-hover hover:text-text-primary px-2 h-6 rounded',
          wrapperClassName,
        )}
      >
        <AccountAddress className="w-full" {...addressProps} />
        <Icon name="info" size={16} className="shrink-0 group-hover:text-icon-hover" />
      </div>
    </InfoPopover>
  );
};
