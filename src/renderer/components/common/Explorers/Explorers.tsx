import { Menu } from '@headlessui/react';
import { encodeAddress } from '@polkadot/util-crypto';
import cn from 'classnames';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Explorer } from '@renderer/domain/chain';
import { toPublicKey } from '@renderer/utils/address';
import { ExplorerIcons } from './common/constants';

type Props = {
  explorers?: Explorer[];
  addressPrefix?: number;
  address: string;
};

const Explorers = ({ explorers, addressPrefix, address }: Props) => {
  const { t } = useI18n();

  return (
    <Menu>
      <div className="relative">
        <Menu.Button className={'hover:bg-primary hover:text-white px-1 w-5 h-5 rounded-full'}>
          {t('accountList.menuButton')}
        </Menu.Button>
        <Menu.Items
          className={
            'bg-white z-10 absolute right-0 top-0 rounded-2lg shadow-surface w-max border-2 border-shade-5 p-2.5'
          }
        >
          {explorers?.map(({ name, account }) => {
            if (!account) return null;

            return (
              <Menu.Item key={name}>
                {({ active }) => (
                  <a
                    className={cn(
                      'rounded-2lg flex items-center gap-1 p-2.5 font-normal select-none',
                      active ? 'bg-primary text-white' : 'bg-white text-neutral',
                    )}
                    href={account.replace('{address}', encodeAddress(toPublicKey(address) || '', addressPrefix))}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Icon as="img" name={ExplorerIcons[name]} /> {t('accountList.explorerButton', { name })}
                  </a>
                )}
              </Menu.Item>
            );
          })}
        </Menu.Items>
      </div>
    </Menu>
  );
};

export default Explorers;
