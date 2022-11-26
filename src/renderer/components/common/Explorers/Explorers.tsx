import { Menu } from '@headlessui/react';
import { encodeAddress } from '@polkadot/util-crypto';
import cn from 'classnames';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Explorer } from '@renderer/domain/chain';
import { Explorer as IconExplorer } from '@renderer/components/ui/Icon/data/explorer';
import { toPublicKey } from '@renderer/utils/address';

const ExplorerIcons: Record<string, IconExplorer> = {
  Polkascan: 'polkascan',
  'Sub.ID': 'subid',
  Subscan: 'subscan',
  Statescan: 'statescan',
};

type Props = {
  address: string;
  addressPrefix: number;
  explorers?: Explorer[];
};

const Explorers = ({ address, addressPrefix, explorers = [] }: Props) => {
  const { t } = useI18n();

  return (
    <div className="relative">
      <Menu>
        <Menu.Button className={'hover:bg-primary hover:text-white px-1 rounded-2xl'}>
          {t('accountList.menuButton')}
        </Menu.Button>
        <Menu.Items
          className={
            'bg-white z-10 absolute right-0 top-0 rounded-2lg shadow-surface w-max border-2 border-shade-5 p-2.5'
          }
        >
          {explorers.map(
            ({ name, account }) =>
              account && (
                <Menu.Item key={name}>
                  {({ active }) => (
                    <a
                      className={cn(
                        'rounded-2lg flex items-center gap-1 p-2.5 font-normal select-none',
                        active ? 'bg-primary text-white' : 'bg-white text-neutral',
                      )}
                      href={account?.replace('{address}', encodeAddress(toPublicKey(address) || '', addressPrefix))}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Icon as="img" name={ExplorerIcons[name]} /> {t('accountList.explorerButton', { name })}
                    </a>
                  )}
                </Menu.Item>
              ),
          )}
        </Menu.Items>
      </Menu>
    </div>
  );
};

export default Explorers;
