import cn from 'classnames';
import { encodeAddress } from '@polkadot/util-crypto';
import { Menu } from '@headlessui/react';

import { Chain } from '@renderer/services/network/common/types';
import { Address, Icon } from '@renderer/components/ui';
import { Explorer } from '@renderer/components/ui/Icon/data/explorer';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  publicKey: PublicKey;
  chains: Chain[];
  className?: string;
};

const AccountsList = ({ publicKey, chains, className }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cn('flex flex-col divide-y divide-gray-200 overflow-y-auto overflow-x-hidden', className)}>
      {chains.map(({ name, addressPrefix, icon, explorers }) => (
        <div key={name} className="flex flex-row items-center gap-2.5 pl-4 pr-6 pt-2 pb-2">
          <img width="36px" height="36px" alt={name} src={icon} />
          <div className="flex flex-col flex-1 overflow-hidden whitespace-nowrap">
            <div className="font-bold text-neutral text-base w-full">{name}</div>
            <Address className="w-full" address={encodeAddress(publicKey, addressPrefix)} />
          </div>
          <div className="relative flex-none">
            <Menu>
              <Menu.Button>•••</Menu.Button>
              <Menu.Items
                className={'z-10 absolute right-0 top-0 rounded-[10px] shadow-surface w-max border border-primary'}
              >
                {explorers?.map(({ name, account }) => {
                  if (!account) {
                    return null;
                  }

                  return (
                    <Menu.Item key={name}>
                      {({ active }) => (
                        <a
                          className={cn(
                            'rounded-[10px] flex items-center gap-1 p-2.5 font-semibold',
                            active ? 'bg-primary text-white' : 'bg-shade-5 text-neutral-variant',
                          )}
                          href={account.replace('{address}', encodeAddress(publicKey, addressPrefix))}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Icon as="svg" name={name as Explorer} /> {t('Explorer.Button', { name })}
                        </a>
                      )}
                    </Menu.Item>
                  );
                })}
              </Menu.Items>
            </Menu>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccountsList;
