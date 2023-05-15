import { Explorers } from '@renderer/components/common';
import { ChainAddress, Icon } from '@renderer/components/ui';
import { Address, SigningType, AccountId } from '@renderer/domain/shared-kernel';
import { Explorer } from '@renderer/domain/chain';
import { toAddress } from '@renderer/shared/utils/address';
import { SigningBadges } from '@renderer/shared/utils/constants';

type Props = {
  address?: Address | AccountId;
  accountName?: string;
  signingType?: SigningType;
  addressPrefix: number;
  explorers?: Explorer[];
};

const ActiveAddress = ({
  address = '',
  accountName = '',
  signingType = SigningType.PARITY_SIGNER,
  explorers,
  addressPrefix,
}: Props) => (
  <div className="flex items-center justify-between h-15 bg-shade-2 p-2.5 rounded-2lg">
    <div className="flex gap-2.5 items-center">
      <Icon name={SigningBadges[signingType]} size={34} />
      <div className="flex flex-col">
        <p className="font-bold text-lg leading-5 text-neutral">{accountName}</p>
        <ChainAddress
          className="leading-4"
          type="short"
          addressStyle="normal"
          address={toAddress(address, { prefix: addressPrefix })}
          size={14}
        />
      </div>
    </div>
    <Explorers address={address} addressPrefix={addressPrefix} explorers={explorers} />
  </div>
);

export default ActiveAddress;
