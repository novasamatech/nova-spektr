import { Menu } from '@headlessui/react';
import cn from 'classnames';
import { ReactNode, useRef } from 'react';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Explorer } from '@renderer/domain/chain';
import { toAddress } from '@renderer/shared/utils/address';
import { DefaultExplorer, ExplorerIcons } from './common/constants';
import { Address } from '@renderer/domain/shared-kernel';

type Props = {
  explorers?: Explorer[];
  addressPrefix?: number;
  address: Address;
  header?: ReactNode;
  className?: string;
};

const Explorers = ({ explorers, addressPrefix, address, header, className }: Props) => {
  const { t } = useI18n();

  const explorersRef = useRef<HTMLDivElement>(null);

  const scrollToMenu = () => {
    setTimeout(() => explorersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  return (
    <Menu>
      {({ open }) => (
        <div className={cn('relative', open && 'z-10', className)}>
          <Menu.Button
            className="flex items-center w-5 h-5 rounded-full hover:bg-primary hover:text-white transition"
            onClick={scrollToMenu}
          >
            <Icon name="options" size={20} />
          </Menu.Button>
          <Menu.Items
            ref={explorersRef}
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
                        'rounded-2lg flex items-center gap-1 p-2.5 text-sm font-normal select-none cursor-pointer',
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
                        'rounded-2lg flex items-center gap-x-2.5 p-2.5 text-sm font-normal select-none transition',
                        active ? 'bg-primary text-white' : 'bg-white text-neutral',
                      )}
                      href={account.replace('{address}', toAddress(address, { prefix: addressPrefix }))}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Icon as="img" name={ExplorerIcons[name] || ExplorerIcons[DefaultExplorer]} size={20} />
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
