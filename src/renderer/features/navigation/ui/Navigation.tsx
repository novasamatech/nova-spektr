import { useUnit } from 'effector-react';

import { useMultisigTx } from '@entities/multisig';
import { NavItem, Props as NavItemProps } from './NavItem';
import { networkModel } from '@entities/network';
import { Paths } from '@shared/routes';
import { walletModel, walletUtils } from '@entities/wallet';
import { BodyText } from '@shared/ui';
import { MultisigTxInitStatus } from '@shared/core';
import { basketModel } from '@entities/basket';

export const Navigation = () => {
  const chains = useUnit(networkModel.$chains);
  const wallet = useUnit(walletModel.$activeWallet);
  const basket = useUnit(basketModel.$basket);

  const { getLiveAccountMultisigTxs } = useMultisigTx({});

  const txs = getLiveAccountMultisigTxs(walletUtils.isMultisig(wallet) ? [wallet.accounts[0].accountId] : []).filter(
    (tx) => tx.status === MultisigTxInitStatus.SIGNING && chains[tx.chainId],
  );

  const NavItems: NavItemProps[] = [
    { icon: 'asset', title: 'navigation.balancesLabel', link: Paths.ASSETS },
    { icon: 'staking', title: 'navigation.stakingLabel', link: Paths.STAKING },
    // TODO: turn on if you want to test governance
    // { icon: 'governance', title: 'navigation.governance', link: Paths.GOVERNANCE },
    {
      icon: 'operations',
      title: 'navigation.mstOperationLabel',
      link: Paths.OPERATIONS,
      badge: Boolean(txs.length) && <BodyText className="ml-auto text-text-tertiary">{txs.length}</BodyText>,
    },
    { icon: 'addressBook', title: 'navigation.addressBookLabel', link: Paths.ADDRESS_BOOK },
  ];

  return (
    <nav className="overflow-y-auto h-full">
      <ul className="flex flex-col gap-2 h-full">
        {NavItems.map(({ icon, title, link, badge }) => (
          <li key={title}>
            <NavItem icon={icon} title={title} link={link} badge={badge} />
          </li>
        ))}
        <li className="mt-auto">
          <NavItem
            icon="operations"
            title="navigation.basketLabel"
            link={Paths.BASKET}
            badge={
              Boolean(basket.length) && (
                <BodyText className="ml-auto text-text-tertiary">
                  {basket.filter((tx) => tx.initiatorWallet === wallet?.id).length}
                </BodyText>
              )
            }
          />
        </li>
        <li>
          <NavItem icon="notification" title="navigation.notificationsLabel" link={Paths.NOTIFICATIONS} />
        </li>
        <li>
          <NavItem icon="settings" title="navigation.settingsLabel" link={Paths.SETTINGS} />
        </li>
      </ul>
    </nav>
  );
};
