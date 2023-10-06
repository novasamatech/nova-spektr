import { Popover, Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren, useState } from 'react';
import cn from 'classnames';
import { useUnit } from 'effector-react';

import { DropdownButton, SearchInput, SmallTitleText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { WalletGroup } from './WalletGroup';
import { ButtonDropdownOption } from '@renderer/shared/ui/types';
import { ChainsRecord } from './common/types';
import { walletProviderModel } from '@renderer/widgets/CreateWallet';
import type { Wallet } from '@renderer/shared/core';
import { WalletType } from '@renderer/shared/core';
import { walletModel, walletUtils } from '@renderer/entities/wallet';
import { includes } from '@renderer/shared/lib/utils';

type Props = {
  chains: ChainsRecord;
};

export const WalletMenu = ({ chains, children }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const [query, setQuery] = useState('');

  const getWalletGroups = (wallets: Wallet[], query = ''): Record<WalletType, Wallet[]> => {
    return wallets.reduce<Record<WalletType, Wallet[]>>(
      (acc, wallet) => {
        let groupIndex: WalletType | undefined;
        if (walletUtils.isSingleShard(wallet)) groupIndex = WalletType.SINGLE_PARITY_SIGNER;
        if (walletUtils.isMultiShard(wallet)) groupIndex = WalletType.MULTISHARD_PARITY_SIGNER;
        if (walletUtils.isMultisig(wallet)) groupIndex = WalletType.MULTISIG;
        if (walletUtils.isWatchOnly(wallet)) groupIndex = WalletType.WATCH_ONLY;
        if (groupIndex && includes(wallet.name, query)) {
          acc[groupIndex].push(wallet);
        }

        return acc;
      },
      {
        [WalletType.SINGLE_PARITY_SIGNER]: [],
        [WalletType.MULTISHARD_PARITY_SIGNER]: [],
        [WalletType.MULTISIG]: [],
        [WalletType.WATCH_ONLY]: [],
      },
    );
  };

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
  ];

  const selectWallet = (walletId: Wallet['id'], closeMenu: () => void) => {
    walletModel.events.walletSelected(walletId);
    closeMenu();
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
                {Object.entries(getWalletGroups(wallets, query)).map(([type, wallets]) => (
                  <WalletGroup
                    key={type}
                    type={type as WalletType}
                    wallets={wallets}
                    onSelect={(walletId) => selectWallet(walletId, close)}
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
