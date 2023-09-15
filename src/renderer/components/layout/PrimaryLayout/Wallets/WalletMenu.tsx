import { Popover, Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren, useState } from 'react';
import cn from 'classnames';
import { useNavigate } from 'react-router-dom';

import { DropdownButton, SearchInput, SmallTitleText } from '@renderer/shared/ui';
import { useI18n, Paths } from '@renderer/app/providers';
import { WalletType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/entities/account';
import WalletGroup from '@renderer/components/layout/PrimaryLayout/Wallets/WalletGroup';
import { useGroupedWallets } from './common/useGroupedWallets';
import { ID, WalletDS } from '@renderer/shared/api/storage';
import WatchOnly from '@renderer/pages/Onboarding/WatchOnly/WatchOnly';
import Vault from '@renderer/pages/Onboarding/Vault/Vault';
import { useToggle } from '@renderer/shared/lib/hooks';
import { ButtonDropdownOption } from '@renderer/shared/ui/types';
import { CreateMultisigAccount } from '@renderer/components/modals';
import { isMultishardWalletItem } from '@renderer/components/layout/PrimaryLayout/Wallets/common/utils';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import {
  ChainsRecord,
  WalletGroupItem,
  MultishardWallet,
} from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import WalletConnect from '@renderer/pages/Onboarding/WalletConnect/WalletConnect';

type Props = {
  chains: ChainsRecord;
  wallets: WalletDS[];
};

const WalletMenu = ({ children, chains, wallets }: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { setActiveAccount, setActiveAccounts } = useAccount();

  const [query, setQuery] = useState('');
  const [isWatchOnlyModalOpen, toggleWatchOnlyModal] = useToggle();
  const [isVaultModalOpen, toggleVaultModal] = useToggle();
  const [isMultisigModalOpen, toggleMultisigModalOpen] = useToggle();
  const [isWalletConnectModalOpen, toggleWalletConnectModalOpen] = useToggle();

  const groupedWallets = useGroupedWallets(wallets, chains, query);

  const dropdownOptions: ButtonDropdownOption[] = [
    { id: 'vault', title: t('wallets.addPolkadotVault'), onClick: toggleVaultModal, iconName: 'vault' },
    { id: 'watch-only', title: t('wallets.addWatchOnly'), onClick: toggleWatchOnlyModal, iconName: 'watchOnly' },
    { id: 'multi', title: t('wallets.addMultisig'), onClick: toggleMultisigModalOpen, iconName: 'multisig' },
    {
      id: 'wallet-connect',
      title: t('wallets.addWalletConnect'),
      onClick: toggleWalletConnectModalOpen,
      iconName: 'multisig',
    },
  ];

  const getAllShardsIds = (wallet: MultishardWallet): ID[] => {
    return wallet.rootAccounts.reduce<ID[]>((acc, root) => {
      if (root.id) {
        acc.push(root.id);
      }
      root.chains.forEach((c) => c.accounts.forEach((a) => a.id && acc.push(a.id)));

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

  const handleCompleteVaultWalletCreation = () => {
    toggleVaultModal();
    setTimeout(() => navigate(Paths.ASSETS), DEFAULT_TRANSITION);
  };

  const handleCompleteWatchOnlyWalletCreation = () => {
    toggleWatchOnlyModal();
    setTimeout(() => navigate(Paths.ASSETS), DEFAULT_TRANSITION);
  };

  const handleCompleteWalletConnectWalletCreation = () => {
    toggleWalletConnectModalOpen();
    setTimeout(() => navigate(Paths.ASSETS), DEFAULT_TRANSITION);
  };

  return (
    <>
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

      <WatchOnly
        isOpen={isWatchOnlyModalOpen}
        onClose={toggleWatchOnlyModal}
        onComplete={handleCompleteWatchOnlyWalletCreation}
      />
      <Vault isOpen={isVaultModalOpen} onClose={toggleVaultModal} onComplete={handleCompleteVaultWalletCreation} />
      <CreateMultisigAccount isOpen={isMultisigModalOpen} onClose={toggleMultisigModalOpen} />
      <WalletConnect
        isOpen={isWalletConnectModalOpen}
        onClose={toggleWalletConnectModalOpen}
        onComplete={handleCompleteWalletConnectWalletCreation}
      />
    </>
  );
};

export default WalletMenu;
