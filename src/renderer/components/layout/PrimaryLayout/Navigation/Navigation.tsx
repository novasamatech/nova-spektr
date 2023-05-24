import cn from 'classnames';
import { NavLink } from 'react-router-dom';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import './Navigation.css';
import { MultisigTxInitStatus } from '@renderer/domain/transaction';
import WalletMenu from '@renderer/components/layout/PrimaryLayout/Wallets/WalletMenu';
import ActiveAccountCard from '@renderer/components/layout/PrimaryLayout/Wallets/ActiveAccountCard';

const Navigation = () => {
  const { LocaleComponent, t } = useI18n();
  const { getActiveAccounts } = useAccount();
  const { getLiveAccountMultisigTxs } = useMultisigTx();

  const activeAccounts = getActiveAccounts();

  const txs = getLiveAccountMultisigTxs(activeAccounts.map((a) => a.accountId)).filter(
    (tx) => tx.status === MultisigTxInitStatus.SIGNING,
  );

  const NavItems = [
    { icon: <Icon name="balance" />, title: 'navigation.balancesLabel', link: Paths.BALANCES },
    { icon: <Icon name="staking" />, title: 'navigation.stakingLabel', link: Paths.STAKING },
    { icon: <Icon name="book" />, title: 'navigation.addressBookLabel', link: Paths.ADDRESS_BOOK },
    {
      icon: <Icon name="operations" />,
      title: 'navigation.mstOperationLabel',
      link: Paths.OPERATIONS,
      badge: txs.length,
    },

    // { icon: <Icon name="history" />, title: 'navigation.historyLabel', link: Paths.HISTORY },
    // { icon: <Icon name="eth" />, title: 'navigation.cameraDEVLabel', link: Paths.CAMERA_DEV },
    // { icon: <Icon name="btc" />, title: 'navigation.chatDEVLabel', link: Paths.CHAT_DEV },
    // { icon: <Icon name="history" />, title: 'navigation.signingDEVLabel', link: Paths.SIGNING },
  ];

  return (
    <>
      <aside className="relative flex gap-y-5 flex-col w-[300px] bg-shade-5 p-5 z-30">
        <WalletMenu>
          <ActiveAccountCard accounts={activeAccounts} />
        </WalletMenu>

        <nav className="flex-1 overflow-y-auto scrollbar">
          <ul className="pr-2.5">
            {NavItems.map(({ icon, title, link, badge }) => (
              <li key={title} className="cursor-pointer select-none rounded-lg hover:bg-black/5 text-gray-500">
                <NavLink
                  to={link}
                  className={({ isActive }) =>
                    cn('flex items-center p-3 outline-offset-reduced', isActive && 'text-primary')
                  }
                >
                  {icon}
                  <span className="font-semibold text-sm ml-3">{t(title)}</span>
                  {!!badge && <div className="ml-auto text-shade-50">{badge}</div>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <NavLink
            to={Paths.NOTIFICATIONS}
            className={({ isActive }) =>
              cn(
                'select-none rounded-lg text-gray-500 flex items-center p-3 mr-2.5 outline-offset-reduced hover:bg-black/5 ',
                isActive && 'text-primary',
              )
            }
          >
            <Icon name="bell" />
            <span className="font-semibold text-sm ml-3">{t('navigation.notificationsLabel')}</span>
          </NavLink>

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
    </>
  );
};

export default Navigation;
