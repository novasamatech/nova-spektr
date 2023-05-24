import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import './Navigation.css';
import { MultisigTxInitStatus } from '@renderer/domain/transaction';
import WalletMenu from '@renderer/components/layout/PrimaryLayout/Wallets/WalletMenu';
import ActiveAccountCard from '@renderer/components/layout/PrimaryLayout/Wallets/ActiveAccountCard';
import NavItem, { Props as NavItemProps } from '../NavItem/NavItem';

const Navigation = () => {
  const { getActiveAccounts } = useAccount();
  const { getLiveAccountMultisigTxs } = useMultisigTx();

  const activeAccounts = getActiveAccounts();

  const txs = getLiveAccountMultisigTxs(activeAccounts.map((a) => a.accountId)).filter(
    (tx) => tx.status === MultisigTxInitStatus.SIGNING,
  );

  const NavItems: NavItemProps[] = [
    { icon: 'balance', title: 'navigation.balancesLabel', link: Paths.BALANCES },
    { icon: 'staking', title: 'navigation.stakingLabel', link: Paths.STAKING },
    { icon: 'book', title: 'navigation.addressBookLabel', link: Paths.ADDRESS_BOOK },
    {
      icon: 'operations',
      title: 'navigation.mstOperationLabel',
      link: Paths.OPERATIONS,
      badge: txs.length.toString(),
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
          <ul className="pr-2.5 flex flex-col gap-2">
            {NavItems.map(({ icon, title, link, badge }) => (
              <li key={title}>
                <NavItem icon={icon} title={title} link={link} badge={badge} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-2">
          <NavItem icon={'bell'} title={'navigation.notificationsLabel'} link={Paths.NOTIFICATIONS} />
          <NavItem icon={'settings'} title={'navigation.settingsLabel'} link={Paths.SETTINGS} />
        </div>
      </aside>
    </>
  );
};

export default Navigation;
