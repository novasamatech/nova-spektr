import { Menu } from '@headlessui/react';
import { encodeAddress } from '@polkadot/util-crypto';
import cn from 'classnames';
import { ReactNode } from 'react';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Explorer } from '@renderer/domain/chain';
import { toPublicKey } from '@renderer/utils/address';
import { ExplorerIcons } from './common/constants';

type Props = {
  explorers?: Explorer[];
  addressPrefix?: number;
  address: string;
  header?: ReactNode;
  className?: string;
};

const Explorers = ({ explorers, addressPrefix, address, header, className }: Props) => {
  const { t } = useI18n();

  return (
    <Menu>
      {({ open }) => (
        <div className={cn('relative', open && 'z-10', className)}>
          <Menu.Button className="flex items-center w-5 h-5 rounded-full hover:bg-primary hover:text-white transition">
            <Icon name="options" size={20} />
          </Menu.Button>
          <Menu.Items
            className={cn(
              'bg-white z-10 absolute right-0 top-0 rounded-2lg',
              'shadow-surface w-max border-2 border-shade-5 p-2.5',
            )}
          >
            {header && (
              <>
                <Menu.Item>
                  {({ active }) => (
                    <div
                      className={cn(
                        'rounded-2lg flex items-center gap-1 p-2.5 font-normal select-none cursor-pointer',
                        active ? 'bg-primary text-white' : 'bg-white text-neutral',
                      )}
                    >
                      {header}
                    </div>
                  )}
                </Menu.Item>
                <div className="p-2.5 text-neutral-variant text-2xs uppercase font-semibold">
                  {t('general.explorers.explorerTitle')}
                </div>
              </>
            )}
            {explorers?.map(({ name, account }) => {
              if (!account) return null;

              return (
                <Menu.Item key={name}>
                  {({ active }) => (
                    <a
                      className={cn(
                        'rounded-2lg flex items-center gap-x-2.5 p-2.5 font-normal select-none transition',
                        active ? 'bg-primary text-white' : 'bg-white text-neutral',
                      )}
                      href={account.replace('{address}', encodeAddress(toPublicKey(address) || '', addressPrefix))}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Icon as="img" name={ExplorerIcons[name]} size={20} />
                      {t('general.explorers.explorerButton', { name })}
                    </a>
                  )}
                </Menu.Item>
              );
            })}
          </Menu.Items>
        </div>
      )}
    </Menu>
  );
};

export default Explorers;
