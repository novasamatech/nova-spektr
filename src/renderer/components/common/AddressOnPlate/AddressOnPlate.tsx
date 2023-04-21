import Explorers from '../Explorers/Explorers';
import { ChainAddress } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import { SigningType, AccountId } from '@renderer/domain/shared-kernel';

type Props = {
  accountId: AccountId;
  name?: string;
  subName?: string;
  signType?: SigningType;
  title: string;
  suffix?: string;
  explorers?: Explorer[];
  addressPrefix?: number;
};

const AddressOnPlate = ({ accountId, name, subName, title, suffix, signType, explorers, addressPrefix }: Props) => {
  return (
    <div className="flex flex-col bg-shade-2 py-2.5 px-[15px] rounded-2lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-variant">{title}</p>
        {suffix && <p className="text-base text-neutral font-semibold leading-5">{suffix}</p>}
      </div>
      <div className="flex gap-x-2.5 items-center mt-2.5">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-x-1.5">
            <ChainAddress
              type="short"
              size={24}
              symbols={12}
              signType={signType}
              accountId={accountId}
              addressPrefix={addressPrefix}
              name={name}
              subName={subName}
            />
          </div>
        </div>
        <Explorers address={accountId} addressPrefix={addressPrefix} explorers={explorers} />
      </div>
    </div>
  );
};

export default AddressOnPlate;
