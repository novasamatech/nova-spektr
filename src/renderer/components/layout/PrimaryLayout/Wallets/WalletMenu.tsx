import { Popover, Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren, useState } from 'react';
import cn from 'classnames';

import { DropdownButton, SearchInput, SmallTitleText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { WalletType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/entities/account';
import { WalletGroup } from '@renderer/components/layout/PrimaryLayout/Wallets/WalletGroup';
import { useGroupedWallets } from './common/useGroupedWallets';
import { ID, WalletDS } from '@renderer/shared/api/storage';
import { ButtonDropdownOption } from '@renderer/shared/ui/types';
import { isMultishardWalletItem } from '@renderer/components/layout/PrimaryLayout/Wallets/common/utils';
import { walletProviderModel } from '@renderer/widgets/CreateWallet';
import {
  ChainsRecord,
  WalletGroupItem,
  MultishardWallet,
} from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';

type Props = {
  chains: ChainsRecord;
  wallets: WalletDS[];
};

export const WalletMenu = ({ children, chains, wallets }: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const { setActiveAccount, setActiveAccounts } = useAccount();

  const [query, setQuery] = useState('');
  const groupedWallets = useGroupedWallets(wallets, chains, query);

  const dropdownOptions: ButtonDropdownOption[] = [
    {
      id: 'vault',
      title: t('wallets.addPolkadotVault'),
      onClick: () => walletProviderModel.events.walletTypeSet(WalletType.SINGLE_PARITY_SIGNER),
      iconName: 'vault',
    },
    {
      id: 'watch-only',
      title: t('wallets.addWatchOnly'),
      onClick: () => walletProviderModel.events.walletTypeSet(WalletType.WATCH_ONLY),
      iconName: 'watchOnly',
    },
    {
      id: 'multi',
      title: t('wallets.addMultisig'),
      onClick: () => walletProviderModel.events.walletTypeSet(WalletType.MULTISIG),
      iconName: 'multisig',
    },
    {
      id: 'nova-wallet',
      title: t('wallets.addNovaWallet'),
      onClick: () => walletProviderModel.events.walletTypeSet(WalletType.NOVA_WALLET),
      iconName: 'novaWallet',
    },
    {
      id: 'wallet-connect',
      title: t('wallets.addWalletConnect'),
      onClick: () => walletProviderModel.events.walletTypeSet(WalletType.WALLET_CONNECT),
      iconName: 'walletConnect',
    },
  ];

  const getAllShardsIds = (wallet: MultishardWallet): ID[] => {
    return wallet.rootAccounts.reduce<ID[]>((acc, root) => {
      if (root.id) {
        acc.push(root.id);
      }
      root.chains?.forEach((c) => c.accounts.forEach((a) => a.id && acc.push(a.id)));

      return acc;
    }, []);
  };

  const selectMultishardWallet = (wallet: MultishardWallet) => {
    setActiveAccounts(getAllShardsIds(wallet));
  };

  const changeActiveAccount = (wallet: WalletGroupItem, closeMenu: () => void) => {
    closeMenu();

    if (isMultishardWalletItem(wallet)) {
      selectMultishardWallet(wallet as MultishardWallet);
    } else {
      if (wallet.id) {
        setActiveAccount(wallet.id);
      }
    }
  };

  return (
    <Popover className="relative">
      <Popover.Button className="border border-container-border bg-left-navigation-menu-background rounded-md w-full shadow-card-shadow">
        {children}
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute z-40 rounded-md bg-token-container-background border border-token-container-border shadow-card-shadow mt-2">
          {({ close }) => (
            <section className={cn('relative w-[289px] bg-card-background')}>
              <header className="px-5 py-3 flex items-center justify-between border-b border-divider">
                <SmallTitleText>{t('wallets.title')}</SmallTitleText>
                <DropdownButton
                  options={dropdownOptions}
                  className="w-[134px] py-2 h-8.5"
                  title={t('wallets.addButtonTitle')}
                />
              </header>

              <div className="p-2 border-b border-divider">
                <SearchInput value={query} placeholder={t('wallets.searchPlaceholder')} onChange={setQuery} />
              </div>

              <ul className="flex flex-col divide-y divide-divider overflow-y-auto max-h-[530px]">
                {groupedWallets &&
                  Object.entries(groupedWallets).map(([type, wallets]) => (
                    <WalletGroup
                      key={type}
                      type={type as WalletType}
                      wallets={wallets}
                      onWalletClick={(wallet) => changeActiveAccount(wallet, close)}
                    />
                  ))}
              </ul>
            </section>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};
