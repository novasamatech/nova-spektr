import cn from 'classnames';
import { forwardRef, useState } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { useWallet } from '@renderer/services/wallet/walletService';
import { Address, Button, Checkbox, Icon, Input } from '@renderer/components/ui';
import { WalletType } from '@renderer/domain/wallet';
import useToggle from '@renderer/hooks/useToggle';
import { IconNames } from '@renderer/components/ui/Icon/data';
import { WalletDS } from '@renderer/services/storage';

type Props = {
  className?: string;
};

const WalletTypeImages: Record<any, IconNames> = {
  [WalletType.WATCH_ONLY]: 'watchOnly',
  [WalletType.PARITY]: 'paritySigner',
};

const WalletTypeLabels = {
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.PARITY]: 'wallets.paritySignerLabel',
};

const Wallets = forwardRef<HTMLDivElement, Props>(({ className }: Props, ref) => {
  const { t } = useI18n();
  const { getLiveWallets, toggleActiveWallet } = useWallet();
  const paritySignerWallets = getLiveWallets({ type: WalletType.PARITY });
  const watchOnlyWallets = getLiveWallets({ type: WalletType.WATCH_ONLY });

  const [isParitySignerOpen, toggleParitySigner] = useToggle(false);
  const [isWatchOnlyOpen, toggleWatchOnly] = useToggle(false);
  const [query, setQuery] = useState('');

  const searchWallet = (wallets: WalletDS[] = [], query: string = '') => {
    return wallets.filter((wallet) => {
      return wallet.name.toLowerCase().includes(query.toLowerCase());
    });
  };

  const searchedParitySignerWallets = searchWallet(paritySignerWallets, query);
  const searchedWatchOnlyWallets = searchWallet(watchOnlyWallets, query);

  const wallets = [
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
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('wallets.searchPlaceholder')}
      />

      {wallets.map(({ label, icon, wallets, shown, toggle }) => (
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
          <div>
            {shown &&
              wallets?.map((wallet) => (
                <label
                  key={wallet.id}
                  className="flex cursor-pointer rounded-2lg hover:bg-shade-10 items-center mx-2.5 h-10"
                >
                  <Checkbox
                    checked={wallet.isActive}
                    onChange={() => toggleActiveWallet(wallet.id || '')}
                    className="m-2.5"
                  />
                  <div className="overflow-hidden">
                    <div className="text-neutral text-sm text-semibold leading-4">{wallet.name}</div>
                    {/* eslint-disable i18next/no-literal-string */}
                    <Address
                      type="short"
                      addressStyle="small"
                      address={(wallet.mainAccounts[0] || wallet.chainAccounts[0]).accountId}
                    />
                    {/* eslint-enable i18next/no-literal-string */}
                  </div>
                </label>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default Wallets;
