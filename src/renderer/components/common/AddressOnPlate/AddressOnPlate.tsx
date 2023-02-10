import Explorers from '../Explorers/Explorers';
import { Address, Identicon } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import { AccountID } from '@renderer/domain/shared-kernel';
import { formatAddress } from '@renderer/shared/utils/address';

type Props = {
  address: AccountID;
  name?: string;
  title: string;
  suffix?: string;
  explorers?: Explorer[];
  addressPrefix: number;
};

const AddressOnPlate = ({ address, name, title, suffix, explorers, addressPrefix }: Props) => {
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
            <Identicon address={address} background={false} size={30} />
            {name ? (
              <span className="text-sm font-semibold text-neutral">{name}</span>
            ) : (
              <Address type="short" symbols={12} showIcon={false} address={currentAddress} addressStyle="normal" />
            )}
          </div>
        </div>
        <Explorers explorers={explorers} addressPrefix={addressPrefix} address={currentAddress} />
      </div>
    </div>
  );
};

export default AddressOnPlate;
