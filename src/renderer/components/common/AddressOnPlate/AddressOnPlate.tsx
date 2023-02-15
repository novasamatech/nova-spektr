import Explorers from '../Explorers/Explorers';
import { Address } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import { AccountID, SigningType } from '@renderer/domain/shared-kernel';
import { formatAddress } from '@renderer/shared/utils/address';

type Props = {
  address: AccountID;
  name?: string;
  subName?: string;
  signType?: SigningType;
  title: string;
  suffix?: string;
  explorers?: Explorer[];
  addressPrefix: number;
};

const AddressOnPlate = ({ address, name, subName, title, suffix, signType, explorers, addressPrefix }: Props) => {
  const currentAddress = formatAddress(address, addressPrefix);

  return (
    <div className="flex flex-col bg-shade-2 py-2.5 px-[15px] rounded-2lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-variant">{title}</p>
        {suffix && <p className="text-base text-neutral text-base font-semibold leading-5">{suffix}</p>}
      </div>
      <div className="flex gap-x-2.5 items-center mt-2.5">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-x-1.5">
            <Address
              type="short"
              size={24}
              symbols={12}
              signType={signType}
              address={currentAddress}
              name={name}
              subName={subName}
            />
          </div>
        </div>
        <Explorers explorers={explorers} addressPrefix={addressPrefix} address={currentAddress} />
      </div>
    </div>
  );
};

export default AddressOnPlate;
