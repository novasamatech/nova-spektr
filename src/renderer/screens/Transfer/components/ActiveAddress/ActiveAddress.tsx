import { Explorers } from '@renderer/components/common';
import { Address, Icon } from '@renderer/components/ui';
import { AccountID } from '@renderer/domain/shared-kernel';
import { Explorer } from '@renderer/domain/chain';

type Props = {
  address: AccountID;
  accountName: string;
  addressPrefix: number;
  explorers?: Explorer[];
};

export const ActiveAddress = ({ address, accountName, explorers, addressPrefix }: Props) => (
  <div className="flex items-center justify-between h-15 bg-shade-2 p-2.5 rounded-2lg">
    <div className="flex gap-2.5 items-center">
      <Icon name="paritySignerBg" size={34} />
      <div className="flex flex-col">
        <p className="font-bold text-lg leading-5 text-neutral">{accountName}</p>
        <Address className="leading-4" type="short" address={address} addressStyle="normal" size={14} />
      </div>
    </div>
    <Explorers explorers={explorers} addressPrefix={addressPrefix} address={address} />
  </div>
);
