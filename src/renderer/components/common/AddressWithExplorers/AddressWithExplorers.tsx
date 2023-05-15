import AccountAddress, {
  getAddress,
  Props as AccountAddressProps,
} from '@renderer/components/common/AccountAddress/AccountAddress';
import { InfoPopover } from '@renderer/components/ui-redesign';
import { Icon } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import useAddressInfo from '@renderer/components/common/AccountAddress/useAddressInfo';

type Props = {
  explorers?: Explorer[];
} & AccountAddressProps;

const AddressWithExplorers = ({ explorers, ...addressProps }: Props) => {
  const address = getAddress(addressProps);
  const popoverItems = useAddressInfo(address, explorers);

  return (
    <InfoPopover data={popoverItems}>
      <div className="flex items-center gap-x-1 cursor-pointer group hover:bg-action-background-hover px-2 py-1 rounded">
        <AccountAddress {...addressProps} />
        <Icon name="info" size={16} className="text-icon-default group-hover:text-icon-hover" />
      </div>
    </InfoPopover>
  );
};

export default AddressWithExplorers;
