import { Popover, Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren, useState } from 'react';
import cn from 'classnames';

import { DropdownButton, SearchInput, SmallTitleText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { addWalletOptions } from '@renderer/components/layout/PrimaryLayout/Wallets/common/constants';
import { useWalletsStructure } from '@renderer/components/layout/PrimaryLayout/Wallets/common/useWalletStructure';
import { SigningType, WalletType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { WalletGroupType } from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { AccountDS } from '@renderer/services/storage';
import { includes } from '@renderer/shared/utils/strings';
import WalletGroup from '@renderer/components/layout/PrimaryLayout/Wallets/WalletGroup';

const WalletMenu = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();
  const { getLiveAccounts } = useAccount();

  const [query, setQuery] = useState('');

  const multishardWallets = useWalletsStructure({ signingType: SigningType.PARITY_SIGNER }, query);
  const watchOnlyAccounts = getLiveAccounts({ signingType: SigningType.WATCH_ONLY });
  const paritySignerAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const multisigAccounts = getLiveAccounts({ signingType: SigningType.MULTISIG });

  const searchAccount = (accounts: AccountDS[] = [], query: string = '') => {
    return accounts.filter((account) => {
      return includes(account.name, query) || includes(account.accountId, query);
    });
  };

  const searchedParitySignerAccounts = searchAccount(
    paritySignerAccounts.filter((a) => !a.walletId),
    query,
  );
  const searchedWatchOnlyAccounts = searchAccount(watchOnlyAccounts, query);
  const searchedMultisigAccounts = searchAccount(multisigAccounts, query);

  const walletGroups: WalletGroupType = {
    [WalletType.SINGLE_PARITY_SIGNER]: searchedParitySignerAccounts,
    [WalletType.MULTISHARD_PARITY_SIGNER]: multishardWallets,
    [WalletType.WATCH_ONLY]: searchedWatchOnlyAccounts,
    [WalletType.MULTISIG]: searchedMultisigAccounts,
  };

  const dropdownOptions = addWalletOptions.map((o) => ({ ...o, title: t(o.title) }));

  return (
    <Popover className="relative">
      <Popover.Button className="border border-container-border bg-left-navigation-menu-background rounded-md w-full">
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
          <section className={cn('relative w-[289px] bg-white')}>
            <header className="px-5 py-3 flex items-center justify-between border-b border-divider">
              <SmallTitleText>{t('wallets.title')}</SmallTitleText>
              <DropdownButton
                options={dropdownOptions}
                buttonProps={{ className: 'w-[134px] justify-center', size: 'sm' }}
                title={t('wallets.addButtonTitle')}
              />
            </header>

            <div className="p-2 border-b border-divider">
              <SearchInput value={query} placeholder={t('wallets.searchPlaceholder')} onChange={setQuery} />
            </div>

            <ul className="flex flex-col divide-y divide-divider">
              {Object.entries(walletGroups).map(([type, wallets]) => (
                <WalletGroup key={type} type={type as WalletType} wallets={wallets} />
              ))}
            </ul>
          </section>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};

export default WalletMenu;
