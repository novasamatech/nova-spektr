import { useUnit } from 'effector-react';

import { MultisigTxInitStatus } from '@/shared/core';
import { Paths } from '@/shared/routes';
import { BodyText } from '@/shared/ui';
import { basketModel } from '@/entities/basket';
import { useMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketUtils } from '../../operations/OperationsConfirm';

import { NavItem, type Props as NavItemProps } from './NavItem';

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
    { icon: 'governance', title: 'navigation.governance', link: Paths.GOVERNANCE },
    { icon: 'fellowshipNav', title: 'navigation.fellowship', link: Paths.FELLOWSHIP },
    {
      icon: 'operations',
      title: 'navigation.mstOperationLabel',
      link: Paths.OPERATIONS,
      badge: Boolean(txs.length) && <BodyText className="ml-auto text-text-tertiary">{txs.length}</BodyText>,
    },
    { icon: 'addressBook', title: 'navigation.addressBookLabel', link: Paths.ADDRESS_BOOK },
  ];

  return (
    <nav className="h-full overflow-y-auto">
      <ul className="flex h-full flex-col gap-2">
        {NavItems.map(({ icon, title, link, badge }) => (
          <li key={title}>
            <NavItem icon={icon} title={title} link={link} badge={badge} />
          </li>
        ))}

        <div className="mt-auto flex flex-col gap-2">
          {wallet && basketUtils.isBasketAvailable(wallet) && (
            <li>
              <NavItem
                icon="operations"
                title="navigation.basketLabel"
                link={Paths.BASKET}
                badge={
                  <BodyText className="ml-auto text-text-tertiary">
                    {basket.filter((tx) => tx.initiatorWallet === wallet?.id).length || ''}
                  </BodyText>
                }
              />
            </li>
          )}
          <li>
            <NavItem icon="notification" title="navigation.notificationsLabel" link={Paths.NOTIFICATIONS} />
          </li>
          <li>
            <NavItem icon="settings" title="navigation.settingsLabel" link={Paths.SETTINGS} />
          </li>
        </div>
      </ul>
    </nav>
  );
};
