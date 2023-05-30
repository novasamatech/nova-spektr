import { Popover, Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren, useState } from 'react';
import cn from 'classnames';

import { DropdownButton, SearchInput, SmallTitleText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { AddWalletOptions } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { AccountId, WalletType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import {
  ChainsRecord,
  WalletGroupItem,
  MultishardWallet,
} from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import WalletGroup from '@renderer/components/layout/PrimaryLayout/Wallets/WalletGroup';
import { useGroupedWallets } from './common/useGroupedWallets';
import { WalletDS } from '@renderer/services/storage';

type Props = {
  chains: ChainsRecord;
  wallets: WalletDS[];
};

const WalletMenu = ({ children, chains, wallets }: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const { setActiveAccount, setActiveAccounts } = useAccount();

  const [query, setQuery] = useState('');

  const groupedWallets = useGroupedWallets(wallets, chains, query);

  const dropdownOptions = AddWalletOptions.map((o) => ({ ...o, title: t(o.title) }));

  const getAllShardsIds = (wallet: MultishardWallet): AccountId[] => {
    return wallet.rootAccounts.reduce<AccountId[]>((acc, root) => {
      acc.push(root.accountId);
      root.chains.forEach((c) => c.accounts.forEach((a) => acc.push(a.accountId)));

      return acc;
    }, []);
  };

  const selectMultishardWallet = (wallet: MultishardWallet) => {
    setActiveAccounts(getAllShardsIds(wallet));
  };

  const changeActiveAccount = (wallet: WalletGroupItem, closeMenu: () => void) => {
    closeMenu();
    if ('rootAccounts' in wallet) {
      selectMultishardWallet(wallet as MultishardWallet);
    } else {
      setActiveAccount(wallet.accountId);
    }
  };

  return (
    <Popover className="relative">
      <Popover.Button className="border border-container-border bg-left-navigation-menu-background rounded-md w-full shadow-card-shadow ">
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
                  className={'w-[134px] justify-center py-2 h-8.5'}
                  title={t('wallets.addButtonTitle')}
                />
              </header>

              <div className="p-2 border-b border-divider">
                <SearchInput value={query} placeholder={t('wallets.searchPlaceholder')} onChange={setQuery} />
              </div>

              <ul className="flex flex-col divide-y divide-divider">
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

export default WalletMenu;
