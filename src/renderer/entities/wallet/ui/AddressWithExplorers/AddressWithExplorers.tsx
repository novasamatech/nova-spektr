import { IconButton } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { AccountAddressProps, AccountAddress, getAddress } from '../AccountAddress/AccountAddress';
import type { Explorer } from '@shared/core';
import { ExplorersPopover } from '../ExplorersPopover/ExplorersPopover';

type Props = {
  explorers?: Explorer[];
  position?: string;
  wrapperClassName?: string;
} & AccountAddressProps;

export const AddressWithExplorers = ({ explorers = [], position, wrapperClassName, ...addressProps }: Props) => {
  const button = (
    <div
      className={cnTw(
        'group flex items-center gap-x-1 px-2 h-6 rounded cursor-pointer transition-colors',
        'hover:bg-action-background-hover focus-within:bg-action-background-hover',
        wrapperClassName,
      )}
    >
      <AccountAddress
        className="w-full"
        addressFont="text-text-secondary group-hover:text-text-primary group-focus-within:text-text-primary"
        {...addressProps}
      />
      <IconButton name="info" />
    </div>
  );

  return <ExplorersPopover button={button} address={getAddress(addressProps)} explorers={explorers} />;
};
