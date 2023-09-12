import { AccountAddress, getAddress, AccountAddressProps, useAddressInfo } from '@renderer/entities/account';
import { InfoPopover, Icon } from '@renderer/shared/ui';
import { Explorer } from '@renderer/entities/chain';
import { ChainId } from '@renderer/domain/shared-kernel';

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
  const address = getAddress(addressProps);
  const popoverItems = useAddressInfo(address, explorers, true);

  return (
    <button
      className="group flex items-center cursor-pointer hover:bg-action-background-hover px-2 py-1.5 rounded w-full text-text-secondary active:text-text-primary"
      onClick={() => onSelected(value)}
    >
      <AccountAddress addressFont="text-body text-inherit" size={size} name={name} {...addressProps} />
      <InfoPopover data={popoverItems}>
        <Icon name="info" size={14} className="ml-2 mr-auto" />
      </InfoPopover>
      <Icon name="right" className="ml-auto" size={20} />
    </button>
  );
};
