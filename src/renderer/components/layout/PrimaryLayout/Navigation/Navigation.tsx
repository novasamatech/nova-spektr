import cn from 'classnames';
import { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

// import { useMatrix } from '@renderer/context/MatrixContext';
import { Icon, Identicon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { SigningType } from '@renderer/domain/shared-kernel';
import useClickOutside from '@renderer/hooks/useClickOutside';
import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import { AccountDS } from '@renderer/services/storage';
import Wallets from '../Wallets/Wallets';
import './Navigation.css';

type CardType = SigningType | 'multiple' | 'none';

const CardStyle: Record<CardType, string> = {
  [SigningType.WATCH_ONLY]: 'bg-alert border-[3px] border-alert',
  [SigningType.PARITY_SIGNER]: 'bg-primary border-[3px] border-primary',
  multiple: 'bg-shade-40 multiple-card',
  none: 'bg-shade-40 border-[3px] border-shade-40',
};

const getCardType = (accounts: AccountDS[]): CardType => {
  if (accounts.length === 0) return 'none';
  if (accounts.length > 1) return 'multiple';

  return accounts[0].signingType;
};

const NavItems = [
  { icon: <Icon name="balance" />, title: 'navigation.balancesLabel', link: Paths.BALANCES },
  { icon: <Icon name="staking" />, title: 'navigation.stakingLabel', link: Paths.STAKING },
  // { icon: <Icon name="history" />, title: 'navigation.historyLabel', link: Paths.HISTORY },
  // { icon: <Icon name="operations" />, title: 'navigation.mstOperationLabel', link: Paths.MULTISIG },
  // { icon: <Icon name="book" />, title: 'navigation.addressBookLabel', link: Paths.ADDRESS_BOOK },
  // { icon: <Icon name="btc" />, title: 'navigation.chatDEVLabel', link: Paths.CHAT_DEV },
  // { icon: <Icon name="eth" />, title: 'navigation.cameraDEVLabel', link: Paths.CAMERA_DEV },
  // { icon: <Icon name="history" />, title: 'navigation.signingDEVLabel', link: Paths.SIGNING },
];

const Navigation = () => {
  const walletsRef = useRef<HTMLDivElement>(null);
  const showWalletsRef = useRef<HTMLButtonElement>(null);

  const { LocaleComponent, t } = useI18n();
  const { getActiveAccounts } = useAccount();

  const activeAccounts = getActiveAccounts();
  const cardType = getCardType(activeAccounts);

  // const navigate = useNavigate();
  // const { matrix, setIsLoggedIn } = useMatrix();

  // const [isProcessing, setIsProcessing] = useState(false);
  const [isWalletsOpen, setIsWalletsOpen] = useState(false);

  useClickOutside([walletsRef, showWalletsRef], () => {
    setIsWalletsOpen(false);
  });

  // const onLogout = async () => {
  //   setIsProcessing(true);
  //
  //   try {
  //     await matrix.logout();
  //     setIsLoggedIn(false);
  //     navigate(Paths.LOGIN);
  //   } catch (error) {
  //     console.warn(error);
  //     setIsProcessing(false);
  //   }
  // };

  const currentAccount = activeAccounts[0];

  const accountName =
    cardType === 'multiple'
      ? t('navigation.multipleWalletsLabel')
      : currentAccount?.name || t('navigation.unknownWalletLabel');

  return (
    <>
      <aside className="relative flex gap-y-5 flex-col w-[300px] bg-shade-5 p-5 z-30">
        <div className={cn('rounded-xl text-white p-4', CardStyle[cardType])}>
          <div className="flex gap-x-2.5">
            <div className="relative">
              {cardType === SigningType.PARITY_SIGNER && (
                <>
                  <Identicon theme="polkadot" address={currentAccount?.accountId || ''} size={46} />

                  <div className="absolute box-border right-0 bottom-0 bg-shade-70 w-5 h-5 flex justify-center items-center rounded-full border border-primary border-solid">
                    <Icon name="paritySigner" size={12} />
                  </div>
                </>
              )}
              {cardType === SigningType.WATCH_ONLY && (
                <>
                  <Identicon theme="polkadot" address={currentAccount?.accountId || ''} size={46} />

                  <div className="absolute box-border right-0 bottom-0 bg-shade-70 w-5 h-5 flex justify-center items-center rounded-full border border-alert border-solid">
                    <Icon name="watchOnly" size={12} />
                  </div>
                </>
              )}
              {cardType === 'multiple' && (
                <div className="relative flex justify-center items-center w-[46px] h-[46px]">
                  <div className="rounded-full w-8 h-8 bg-white flex justify-center items-center z-10">
                    <Icon name="emptyIdenticon" size={16} />
                  </div>
                  <div className="bg-shade-30 rounded-full w-5 h-5 absolute left-0"></div>
                  <div className="bg-shade-30 rounded-full w-5 h-5 absolute top-0"></div>
                  <div className="bg-shade-30 rounded-full w-5 h-5 absolute right-0"></div>
                  <div className="bg-shade-30 rounded-full w-5 h-5 absolute bottom-0"></div>
                </div>
              )}
              {cardType === 'none' && (
                <div className="bg-white flex justify-center items-center w-[46px] h-[46px] rounded-full">
                  <Icon name="emptyIdenticon" size={30} />
                </div>
              )}
            </div>
            <button
              ref={showWalletsRef}
              type="button"
              className="flex justify-between flex-1 truncate"
              onClick={() => setIsWalletsOpen((value) => !value)}
            >
              <span className="text-xl leading-6 mr-1 text-left truncate">{accountName}</span>
              <Icon name="right" size={40} className="shrink-0" />
            </button>
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
        {/*{matrix.isLoggedIn && (*/}
        {/*  <Button variant="outline" pallet="primary" disabled={isProcessing} onClick={onLogout}>*/}
        {/*    {t('Logout')}*/}
        {/*  </Button>*/}
        {/*)}*/}

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
            {/*<Icon className="text-success" name="networkDuotone" />*/}
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
