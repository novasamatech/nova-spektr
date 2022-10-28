import { Menu } from '@headlessui/react';
import cn from 'classnames';
import { encodeAddress } from '@polkadot/util-crypto';

import { Icon } from '@renderer/components/ui';
import { Chain } from '@renderer/domain/chain';
import { Explorer } from '@renderer/components/ui/Icon/data/explorer';
import { toPublicKey } from '@renderer/utils/address';
import { useI18n } from '@renderer/context/I18nContext';

const ExplorerIcons: Record<string, Explorer> = {
  Polkascan: 'polkascan',
  'Sub.ID': 'subid',
  Subscan: 'subscan',
  Statescan: 'statescan',
};

type Props = {
  chain: Chain;
  address: string;
};

const Explorers = ({ chain, address }: Props) => {
  const { t } = useI18n();

  return (
    <Menu>
      <Menu.Button className={'hover:bg-primary hover:text-white px-1 rounded-2xl'}>
        {t('accountList.menuButton')}
      </Menu.Button>
      <Menu.Items
        className={
          'bg-white z-10 absolute right-0 top-0 rounded-2lg shadow-surface w-max border-2 border-shade-5 p-2.5'
        }
      >
        {chain.explorers?.map(
          ({ name, account }) =>
            account && (
              <Menu.Item key={name}>
                {({ active }) => (
                  <a
                    className={cn(
                      'rounded-2lg flex items-center gap-1 p-2.5 font-normal select-none',
                      active ? 'bg-primary text-white' : 'bg-white text-neutral',
                    )}
                    href={account.replace('{address}', encodeAddress(toPublicKey(address) || '', chain.addressPrefix))}
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
  );
};

export default Explorers;
