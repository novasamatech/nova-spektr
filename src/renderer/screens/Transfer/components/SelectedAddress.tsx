import { Explorers } from '@renderer/components/common';
import { Address, Icon } from '@renderer/components/ui';
import { formatAddress } from '@renderer/utils/address';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { Account } from '@renderer/domain/account';

type Props = {
  account: Account;
  connection: ExtendedChain;
};

const SelectedAddress = ({ account, connection }: Props) => {
  const currentAddress = formatAddress(account.accountId || '', connection.addressPrefix);

  return (
    <div className="bg-white shadow-surface p-5 rounded-2xl w-full">
      <div className="flex items-center justify-between h-15 bg-shade-2 p-2.5 rounded-2lg">
        <div className="flex gap-2.5 items-center">
          <Icon name="paritySignerBackground" size={34} />
          <div className="flex flex-col">
            <div className="font-bold text-lg leading-5 text-neutral">{account.name}</div>
            <Address className="leading-4" type="short" address={currentAddress} addressStyle="normal" size={14} />
          </div>
        </div>
        <Explorers explorers={connection.explorers} addressPrefix={connection.addressPrefix} address={currentAddress} />
      </div>
    </div>
  );
};

export default SelectedAddress;
