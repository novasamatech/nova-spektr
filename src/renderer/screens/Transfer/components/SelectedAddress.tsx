import { Explorers } from '@renderer/components/common';
import { Address, Icon } from '@renderer/components/ui';
import { formatAddress } from '@renderer/utils/address';
import { Wallet } from '@renderer/domain/wallet';
import { ExtendedChain } from '@renderer/services/network/common/types';

type Props = {
  wallet: Wallet;
  connection: ExtendedChain;
};

const SelectedAddress = ({ wallet, connection }: Props) => {
  const currentAddress = formatAddress(
    wallet.mainAccounts[0].accountId || wallet.chainAccounts[0].accountId || '',
    connection.addressPrefix,
  );

  return (
    <div className="bg-white shadow-surface p-5 rounded-2xl w-full">
      <div className="flex items-center justify-between h-15 bg-shade-2 p-2.5 rounded-2lg">
        <div className="flex gap-2.5 items-center">
          <Icon name="paritySignerBackground" size={34} />
          <div className="flex flex-col">
            <div className="font-bold text-lg leading-5 text-neutral">{wallet.name}</div>
            <Address className="leading-4" type="short" address={currentAddress} addressStyle="normal" size={14} />
          </div>
        </div>
        <Explorers chain={connection} address={currentAddress} />
      </div>
    </div>
  );
};

export default SelectedAddress;
