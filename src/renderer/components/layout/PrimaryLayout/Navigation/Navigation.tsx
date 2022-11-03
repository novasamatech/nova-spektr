import cn from 'classnames';
import { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { Button, Icon, Identicon } from '@renderer/components/ui';
import { useMatrix } from '@renderer/context/MatrixContext';
import Paths from '@renderer/routes/paths';
import { useI18n } from '@renderer/context/I18nContext';
import { useWallet } from '@renderer/services/wallet/walletService';
import { WalletType } from '@renderer/domain/wallet';
import Wallets from '../Wallets/Wallets';
import useClickOutside from '@renderer/hooks/useClickOutside';

const CardStyle = {
  [WalletType.WATCH_ONLY]: 'bg-alert',
  [WalletType.PARITY]: 'bg-primary',
};

const NavItems = [
  { icon: <Icon name="balance" />, title: 'navigation.balancesLabel', link: Paths.BALANCES },
  { icon: <Icon name="history" />, title: 'navigation.historyLabel', link: Paths.HISTORY },
  { icon: <Icon name="operations" />, title: 'navigation.mstOperationLabel', link: Paths.MULTISIG },
  { icon: <Icon name="book" />, title: 'navigation.addressBookLabel', link: Paths.ADDRESS_BOOK },
  // { icon: <Icon name="btc" />, title: 'navigation.chatDEVLabel', link: Paths.CHAT_DEV },
  { icon: <Icon name="eth" />, title: 'navigation.cameraDEVLabel', link: Paths.CAMERA_DEV },
];

const Navigation = () => {
  const walletsRef = useRef<HTMLDivElement>(null);
  const showWalletsRef = useRef<HTMLButtonElement>(null);
  const { LocaleComponent, t } = useI18n();
  const { getActiveWallets } = useWallet();
  const activeWallets = getActiveWallets();
  const walletType = activeWallets?.[0]?.type || WalletType.PARITY;

  const navigate = useNavigate();
  const { matrix, setIsLoggedIn } = useMatrix();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isWalletsOpen, setIsWalletsOpen] = useState(false);

  useClickOutside([walletsRef, showWalletsRef], () => {
    setIsWalletsOpen(false);
  });

  const onLogout = async () => {
    setIsProcessing(true);

    try {
      await matrix.logout();
      setIsLoggedIn(false);
      navigate(Paths.LOGIN);
    } catch (error) {
      console.warn(error);
      setIsProcessing(false);
    }
  };

  const currentWallet = activeWallets?.length ? activeWallets[0] : undefined;
  const currentAccount = currentWallet?.mainAccounts[0] || currentWallet?.chainAccounts[0];

  return (
    <>
      <aside className="relative flex gap-y-5 flex-col w-[300px] bg-shade-5 p-5 z-30">
        <div className={cn('rounded-xl text-white', CardStyle[walletType])}>
          <div className="flex gap-x-2.5 pl-4 pt-4 pr-2">
            <Identicon theme="polkadot" address={currentAccount?.accountId || ''} size={46} />
            <button
              ref={showWalletsRef}
              onClick={() => setIsWalletsOpen((value) => !value)}
              type="button"
              className="flex justify-between flex-1 truncate"
            >
              <span className="text-xl leading-6 mr-1 text-left truncate">
                {currentWallet?.name || t('navigation.unknownWalletLabel')}
              </span>
              <Icon name="right" size={40} className="shrink-0" />
            </button>
          </div>
          <div className="flex gap-x-1.5 px-4 pb-4 mt-7">
            <button type="button">
              <Icon name="copy" />
            </button>
            <button type="button">
              <Icon name="qr" />
            </button>
            <span className="ml-auto">$1,148.14</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar">
          <ul className="pr-2.5">
            {NavItems.map(({ icon, title, link }) => (
              <li key={title} className="cursor-pointer select-none rounded-lg hover:bg-black/5 text-gray-500">
                <NavLink
                  to={link}
                  className={({ isActive }) =>
                    cn('flex items-center p-3 outline-offset-reduced', isActive && 'text-primary')
                  }
                >
                  {icon}
                  <span className="font-semibold text-sm ml-3">{t(title)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {matrix.isLoggedIn && (
          <Button variant="outline" pallet="primary" disabled={isProcessing} onClick={onLogout}>
            {t('Logout')}
          </Button>
        )}

        <div>
          <NavLink
            to={Paths.SETTINGS}
            className={({ isActive }) =>
              cn(
                'select-none rounded-lg text-gray-500 flex items-center p-3 mr-2.5 outline-offset-reduced hover:bg-black/5 ',
                isActive && 'text-primary',
              )
            }
          >
            <Icon name="settings" />
            <span className="font-semibold text-sm ml-3">{t('navigation.settingsLabel')}</span>
          </NavLink>
          <div className="flex justify-between bg-gradient-to-b from-shade-2 py-2 px-3 rounded-t-2lg">
            <LocaleComponent top short />
            <Icon className="text-success" name="networkDuotone" />
          </div>
        </div>
      </aside>

      <Wallets
        ref={walletsRef}
        className={cn(
          'ease-in-out transition-all transform duration-200 absolute z-20 w-[350px] left-0 top-0',
          isWalletsOpen ? 'translate-x-[300px] opacity-100 visible' : 'translate-x-0 opacity-0 invisible',
        )}
      />
    </>
  );
};

export default Navigation;
