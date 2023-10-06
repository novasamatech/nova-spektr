import { useEffect, useState } from 'react';
import { keyBy } from 'lodash';
import { useUnit } from 'effector-react';

import { useMultisigTx } from '@renderer/entities/multisig';
import './Navigation.css';
import { MultisigTxInitStatus } from '@renderer/entities/transaction';
import { WalletMenu } from '../Wallets/WalletMenu';
import { WalletCard } from '../Wallets/WalletCard';
import NavItem, { Props as NavItemProps } from '../NavItem/NavItem';
import { chainsService } from '@renderer/entities/network';
import { ChainsRecord } from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { Paths } from '../../../../app/providers/routes/paths';
import { Shimmering } from '@renderer/shared/ui';
import { accountModel } from '@renderer/entities/wallet';
import { cnTw } from '@renderer/shared/lib/utils';

const Navigation = () => {
  const activeAccounts = useUnit(accountModel.$activeAccounts);

  const { getLiveAccountMultisigTxs } = useMultisigTx({});

  const [chains, setChains] = useState<ChainsRecord>({});

  useEffect(() => {
    const chains = chainsService.getChainsData();

    setChains(keyBy(chains, 'chainId'));
  }, []);

  const txs = getLiveAccountMultisigTxs(activeAccounts.map((a) => a.accountId)).filter(
    (tx) => tx.status === MultisigTxInitStatus.SIGNING && chains[tx.chainId],
  );

  const NavItems: NavItemProps[] = [
    { icon: 'asset', title: 'navigation.balancesLabel', link: Paths.ASSETS },
    { icon: 'staking', title: 'navigation.stakingLabel', link: Paths.STAKING },
    {
      icon: 'operations',
      title: 'navigation.mstOperationLabel',
      link: Paths.OPERATIONS,
      badge: txs.length,
    },
    { icon: 'addressBook', title: 'navigation.addressBookLabel', link: Paths.ADDRESS_BOOK },

    // { icon: <Icon name="history" />, title: 'navigation.historyLabel', link: Paths.HISTORY },
    // { icon: <Icon name="eth" />, title: 'navigation.cameraDEVLabel', link: Paths.CAMERA_DEV },
    // { icon: <Icon name="btc" />, title: 'navigation.chatDEVLabel', link: Paths.CHAT_DEV },
    // { icon: <Icon name="history" />, title: 'navigation.signingDEVLabel', link: Paths.SIGNING },
  ];

  return (
    <aside
      className={cnTw(
        'relative flex gap-y-6 flex-col w-[240px] p-4 z-30',
        'bg-left-navigation-menu-background border-r border-r-container-border',
      )}
    >
      <WalletMenu chains={chains}>
        {activeAccounts?.length ? <WalletCard chains={chains} /> : <Shimmering height={54} className="w-full" />}
      </WalletMenu>

      <nav className="flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-2">
          {NavItems.map(({ icon, title, link, badge }) => (
            <li key={title}>
              <NavItem icon={icon} title={title} link={link} badge={badge} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-2">
        <NavItem icon={'notification'} title={'navigation.notificationsLabel'} link={Paths.NOTIFICATIONS} />
        <NavItem icon={'settings'} title={'navigation.settingsLabel'} link={Paths.SETTINGS} />
      </div>
    </aside>
  );
};

export default Navigation;
