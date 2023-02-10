import Explorers from '../Explorers/Explorers';
import { Address, Icon } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import { AccountID } from '@renderer/domain/shared-kernel';
import { formatAddress } from '@renderer/shared/utils/address';

type Props = {
  address: AccountID;
  name: string;
  explorers?: Explorer[];
  addressPrefix: number;
};

const AddressOnPlate = ({ address, name, explorers, addressPrefix }: Props) => {
  const currentAddress = formatAddress(address, addressPrefix);

  return (
    <div className="bg-white shadow-surface p-5 rounded-2xl w-full">
      <div className="flex items-center justify-between h-15 bg-shade-2 p-2.5 rounded-2lg">
        <div className="flex gap-2.5 items-center">
          <Icon name="paritySignerBackground" size={34} />
          <div className="flex flex-col">
            <p className="font-bold text-lg leading-5 text-neutral">{name}</p>
            <Address className="leading-4" type="short" address={currentAddress} addressStyle="normal" size={14} />
          </div>
        </div>
        <Explorers explorers={explorers} addressPrefix={addressPrefix} address={currentAddress} />
      </div>
    </div>
  );
};

export default AddressOnPlate;
