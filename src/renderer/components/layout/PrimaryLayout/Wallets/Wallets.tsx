import cn from 'classnames';
import { forwardRef, useState } from 'react';

import { Address, Button, Checkbox, Icon, Input } from '@renderer/components/ui';
import { IconNames } from '@renderer/components/ui/Icon/data';
import { useI18n } from '@renderer/context/I18nContext';
import useToggle from '@renderer/hooks/useToggle';
import { AccountDS } from '@renderer/services/storage';
import { useAccount } from '@renderer/services/account/accountService';
import { SigningType } from '@renderer/domain/shared-kernel';

type Props = {
  className?: string;
};

const SigningTypeImages: Record<SigningType, IconNames> = {
  [SigningType.WATCH_ONLY]: 'watchOnlyBackground',
  [SigningType.PARITY_SIGNER]: 'paritySignerBackground',
};

const SigningTypeLabels = {
  [SigningType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [SigningType.PARITY_SIGNER]: 'wallets.paritySignerLabel',
};

const Wallets = forwardRef<HTMLDivElement, Props>(({ className }, ref) => {
  const { t } = useI18n();
  const { getLiveAccounts, toggleActiveAccount } = useAccount();
  const [isParitySignerOpen, toggleParitySigner] = useToggle(true);
  const [isWatchOnlyOpen, toggleWatchOnly] = useToggle(true);

  const [query, setQuery] = useState('');

  const paritySignerAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const watchOnlyAccountss = getLiveAccounts({ signingType: SigningType.WATCH_ONLY });

  const searchAccount = (accounts: AccountDS[] = [], query: string = '') => {
    return accounts.filter((account) => {
      return account.name.toLowerCase().includes(query.toLowerCase()) || (account.accountId || '').includes(query);
    });
  };

  const searchedParitySignerAccountss = searchAccount(paritySignerAccounts, query);
  const searchedWatchOnlyAccounts = searchAccount(watchOnlyAccountss, query);

  const accountGroups = [
    {
      label: SigningTypeLabels[SigningType.PARITY_SIGNER],
      icon: SigningTypeImages[SigningType.PARITY_SIGNER],
      accounts: searchedParitySignerAccountss,
      shown: isParitySignerOpen,
      toggle: toggleParitySigner,
    },
    {
      label: SigningTypeLabels[SigningType.WATCH_ONLY],
      icon: SigningTypeImages[SigningType.WATCH_ONLY],
      accounts: searchedWatchOnlyAccounts,
      shown: isWatchOnlyOpen,
      toggle: toggleWatchOnly,
    },
  ];

  return (
    <div ref={ref} className={cn('flex px-2.5 py-4 flex-col gap-2.5 h-full bg-shade-2', className)}>
      <Input
        wrapperClass="w-full bg-shade-5 rounded-2lg text-sm"
        prefixElement={<Icon name="search" className="w-5 h-5" />}
        placeholder={t('wallets.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {accountGroups.map(({ label, icon, accounts, shown, toggle }) => (
        <div
          key={label}
          className="border border-shade-5 shadow-surface rounded-2lg bg-white font-semibold text-xs divide-y"
        >
          <div className="flex items-center justify-between uppercase text-neutral-variant p-2.5">
            <div className="flex items-center gap-1.25 px-2.5">
              <Icon name={icon} />
              {t(label)}
            </div>
            <Button pallet="dark" variant="text" onClick={toggle}>
              <Icon name={shown ? 'up' : 'down'} />
            </Button>
          </div>
          {shown && accounts.length > 0 && (
            <ul>
              {accounts?.map((account) => (
                <li key={account.id} className="flex cursor-pointer hover:bg-shade-10 items-center px-2.5 py-1">
                  <Checkbox
                    className="w-full h-full"
                    checked={account.isActive}
                    onChange={() => toggleActiveAccount(account.id || '')}
                  >
                    <div className="ml-2.5 overflow-hidden">
                      <div className="text-neutral text-sm text-semibold leading-4 truncate">{account.name}</div>
                      <Address type="short" addressStyle="small" address={account.accountId || ''} />
                    </div>
                  </Checkbox>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
});

export default Wallets;
