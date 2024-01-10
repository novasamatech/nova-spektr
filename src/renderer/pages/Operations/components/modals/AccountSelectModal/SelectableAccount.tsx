import { AccountAddress, AccountAddressProps } from '@entities/wallet';
import { Icon } from '@shared/ui';
import type { Explorer, ChainId } from '@shared/core';

type Props<T extends any> = {
  explorers?: Explorer[];
  value: T;
  onSelected: (value: T) => void;
  chainId: ChainId;
} & AccountAddressProps;

export const SelectableAccount = <T extends any>({
  explorers,
  size = 20,
  value,
  onSelected,
  chainId,
  name,
  ...addressProps
}: Props<T>) => {
  return (
    <button
      className="group flex items-center cursor-pointer hover:bg-action-background-hover px-2 py-1.5 rounded w-full text-text-secondary active:text-text-primary"
      onClick={() => onSelected(value)}
    >
      <AccountAddress addressFont="text-body text-inherit" size={size} name={name} {...addressProps} />
      <Icon name="right" className="ml-auto" size={16} />
    </button>
  );
};
