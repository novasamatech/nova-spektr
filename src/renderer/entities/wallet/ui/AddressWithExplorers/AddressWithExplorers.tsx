import { type Explorer } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui';
import { AccountAddress, type AccountAddressProps, getAddress } from '../AccountAddress/AccountAddress';
import { ExplorersPopover } from '../ExplorersPopover/ExplorersPopover';

type Props = {
  explorers?: Explorer[];
  wrapperClassName?: string;
} & AccountAddressProps;

export const AddressWithExplorers = ({ explorers = [], wrapperClassName, ...addressProps }: Props) => {
  const button = (
    <div
      className={cnTw(
        'group flex h-6 cursor-pointer items-center gap-x-1 rounded px-2 transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
        wrapperClassName,
      )}
    >
      <AccountAddress
        className="w-full"
        addressFont="text-text-secondary group-hover:text-text-primary group-focus-within:text-text-primary"
        {...addressProps}
      />
      <IconButton name="details" />
    </div>
  );

  return <ExplorersPopover button={button} address={getAddress(addressProps)} explorers={explorers} />;
};
