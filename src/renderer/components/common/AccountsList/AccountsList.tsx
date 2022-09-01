import cn from 'classnames';
import { encodeAddress } from '@polkadot/util-crypto';
import { Menu } from '@headlessui/react';

import { Chain } from '@renderer/services/network/common/types';
import { Address, Icon } from '@renderer/components/ui';
import { Explorer } from '@renderer/components/ui/Icon/data/explorer';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { useI18n } from '@renderer/context/I18nContext';
import { isCorrectPublicKey } from '@renderer/utils/address';

const ExplorerIcons: Record<string, Explorer> = {
  Polkascan: 'polkascan',
  'Sub.ID': 'subid',
  Subscan: 'subscan',
  Statescan: 'statescan',
};

type Props = {
  publicKey?: PublicKey;
  chains: Chain[];
  className?: string;
  limitNumber?: number;
};

const AccountsList = ({ publicKey, chains, className, limitNumber }: Props) => {
  const { t } = useI18n();

  console.log(limitNumber);
  const limitedChains = limitNumber ? chains.slice(0, limitNumber) : chains;

  return (
    <div className={cn('flex flex-col z-0 divide-y divide-gray-200 overflow-y-auto overflow-x-hidden', className)}>
      {publicKey && isCorrectPublicKey(publicKey) ? (
        limitedChains.map(({ name, addressPrefix, icon, explorers }) => (
          <div key={name} className="flex flex-row items-center gap-2.5 pr-6 pl-4 pt-1.25 pb-1.25">
            <img width="36px" height="36px" alt={name} src={icon} />
            <div className="flex flex-col flex-1 overflow-hidden whitespace-nowrap">
              <div className="font-bold text-neutral text-base w-full leading-5">{name}</div>
              <Address className="w-full" address={encodeAddress(publicKey, addressPrefix)} />
            </div>
            <div className="relative flex-none">
              <Menu>
                <Menu.Button className={'hover:bg-primary hover:text-white px-1 rounded-2xl'}>•••</Menu.Button>
                <Menu.Items
                  className={'z-10 absolute right-0 top-0 rounded-2lg shadow-surface w-max border border-primary'}
                >
                  {explorers?.map(({ name, account }) => {
                    return (
                      account && (
                        <Menu.Item key={name}>
                          {({ active }) => (
                            <a
                              className={cn(
                                'rounded-2lg flex items-center gap-1 p-2.5 font-semibold select-none',
                                active ? 'bg-primary text-white' : 'bg-shade-5 text-neutral-variant',
                              )}
                              href={account.replace('{address}', encodeAddress(publicKey, addressPrefix))}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <Icon as="svg" name={ExplorerIcons[name]} /> {t('explorer.button', { name })}
                            </a>
                          )}
                        </Menu.Item>
                      )
                    );
                  })}
                </Menu.Items>
              </Menu>
            </div>
          </div>
        ))
      ) : (
        <div className="overflow-hidden divide-y divide-gray-200">
          {limitedChains.map(({ name }) => (
            <div key={name} className="flex items-center h-[50px] gap-2.5 pl-4 pr-6 pt-1.25 pb-1.25">
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
      )}
    </div>
  );
};

export default AccountsList;
