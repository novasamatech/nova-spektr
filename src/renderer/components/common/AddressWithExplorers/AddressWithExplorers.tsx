import AccountAddress, {
  getAddress,
  Props as AccountAddressProps,
} from '@renderer/components/common/AccountAddress/AccountAddress';
import { InfoPopover } from '@renderer/components/ui-redesign';
import { Icon } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import useAddressInfo from '@renderer/components/common/AccountAddress/useAddressInfo';

type Props = {
  showMatrix?: boolean;
  explorers?: Explorer[];
} & AccountAddressProps;

const AddressWithExplorers = ({ explorers = [], showMatrix, ...addressProps }: Props) => {
  const address = getAddress(addressProps);
  const popoverItems = useAddressInfo(address, explorers, showMatrix);

  return (
    <InfoPopover data={popoverItems}>
      <div className="flex max-w-full items-center gap-x-1 cursor-pointer group hover:bg-action-background-hover hover:text-text-primary px-2 h-6 rounded">
        <AccountAddress className="w-full" {...addressProps} />
        <Icon name="info" size={16} className="text-icon-default group-hover:text-icon-hover" />
      </div>
    </InfoPopover>
  );
};

export default AddressWithExplorers;
