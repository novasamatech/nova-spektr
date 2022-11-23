import cn from 'classnames';
import { forwardRef, useState } from 'react';

import { Address, Button, Checkbox, Icon, Input } from '@renderer/components/ui';
import { IconNames } from '@renderer/components/ui/Icon/data';
import { useI18n } from '@renderer/context/I18nContext';
import { WalletType } from '@renderer/domain/wallet';
import useToggle from '@renderer/hooks/useToggle';
import { WalletDS } from '@renderer/services/storage';
import { useWallet } from '@renderer/services/wallet/walletService';

type Props = {
  className?: string;
};

const WalletTypeImages: Record<WalletType, IconNames> = {
  [WalletType.WATCH_ONLY]: 'watchOnlyBackground',
  [WalletType.PARITY]: 'paritySignerBackground',
};

const WalletTypeLabels = {
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.PARITY]: 'wallets.paritySignerLabel',
};

const Wallets = forwardRef<HTMLDivElement, Props>(({ className }, ref) => {
  const { t } = useI18n();
  const { getLiveWallets, toggleActiveWallet } = useWallet();
  const [isParitySignerOpen, toggleParitySigner] = useToggle(false);
  const [isWatchOnlyOpen, toggleWatchOnly] = useToggle(false);

  const [query, setQuery] = useState('');

  const paritySignerWallets = getLiveWallets({ type: WalletType.PARITY });
  const watchOnlyWallets = getLiveWallets({ type: WalletType.WATCH_ONLY });

  const searchWallet = (wallets: WalletDS[] = [], query: string = '') => {
    return wallets.filter((wallet) => {
      return wallet.name.toLowerCase().includes(query.toLowerCase());
    });
  };

  const searchedParitySignerWallets = searchWallet(paritySignerWallets, query);
  const searchedWatchOnlyWallets = searchWallet(watchOnlyWallets, query);

  const walletGroups = [
    {
      label: WalletTypeLabels[WalletType.PARITY],
      icon: WalletTypeImages[WalletType.PARITY],
      wallets: searchedParitySignerWallets,
      shown: isParitySignerOpen,
      toggle: toggleParitySigner,
    },
    {
      label: WalletTypeLabels[WalletType.WATCH_ONLY],
      icon: WalletTypeImages[WalletType.WATCH_ONLY],
      wallets: searchedWatchOnlyWallets,
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

      {walletGroups.map(({ label, icon, wallets, shown, toggle }) => (
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
          {shown && wallets.length > 0 && (
            <ul>
              {wallets?.map((wallet) => (
                <li key={wallet.id} className="flex cursor-pointer hover:bg-shade-10 items-center px-2.5 py-1">
                  <Checkbox
                    className="w-full h-full"
                    checked={wallet.isActive}
                    onChange={() => toggleActiveWallet(wallet.id || '')}
                  >
                    <div className="ml-2.5 overflow-hidden">
                      <div className="text-neutral text-sm text-semibold leading-4">{wallet.name}</div>
                      <Address
                        type="short"
                        addressStyle="small"
                        address={(wallet.mainAccounts[0] || wallet.chainAccounts[0]).accountId}
                      />
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
