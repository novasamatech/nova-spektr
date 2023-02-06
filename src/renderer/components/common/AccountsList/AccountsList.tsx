import cn from 'classnames';
import { encodeAddress } from '@polkadot/util-crypto';

import { Chain } from '@renderer/domain/chain';
import { Address } from '@renderer/components/ui';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { isCorrectPublicKey } from '@renderer/shared/hooks/utils/address';
import Explorers from '../Explorers/Explorers';

type Props = {
  publicKey?: PublicKey;
  chains: Chain[];
  className?: string;
  limit?: number;
};

const AccountsList = ({ publicKey, chains, className, limit }: Props) => {
  const limitedChains = limit ? chains.slice(0, limit) : chains;

  if (!publicKey || !isCorrectPublicKey(publicKey)) {
    return (
      <div className="overflow-hidden divide-y divide-gray-200">
        {limitedChains.map(({ name }) => (
          <div key={name} className="flex items-center h-[50px] gap-2.5 px-4 py-1.25">
            <div className="border border-shade-20 border-dashed rounded-2lg w-9 h-9 box-border"></div>
            <div className="flex flex-col gap-2">
              <div className="border border-shade-20 border-dashed rounded-2lg w-16 h-3 box-border"></div>
              <div className="flex gap-2">
                <div className="border border-shade-20 border-dashed rounded-full w-3 h-3 box-border"></div>
                <div className="border border-shade-20 border-dashed rounded-full w-60 h-3 box-border"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className={cn('flex flex-col z-0 divide-y divide-gray-200 overflow-y-auto overflow-x-hidden', className)}>
      {limitedChains.map((chain) => {
        const { name, icon, addressPrefix } = chain;

        return (
          <li key={name} className="flex flex-row items-center gap-2.5 px-6 py-1.25">
            <img width="36px" height="36px" alt={name} src={icon} />
            <div className="flex flex-col flex-1 overflow-hidden whitespace-nowrap">
              <div className="font-bold text-neutral text-base w-full leading-5">{name}</div>
              <Address className="w-full" address={encodeAddress(publicKey, addressPrefix)} />
            </div>

            <Explorers
              explorers={chain.explorers}
              addressPrefix={chain.addressPrefix}
              address={encodeAddress(publicKey, addressPrefix)}
            />
          </li>
        );
      })}
    </ul>
  );
};

export default AccountsList;
