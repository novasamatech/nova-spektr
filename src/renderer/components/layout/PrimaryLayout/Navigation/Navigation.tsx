import cn from 'classnames';
import { useRef, useState, useEffect } from 'react';
import { keyBy } from 'lodash';

import { Icon, Identicon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { SigningType, ChainId } from '@renderer/domain/shared-kernel';
import { useClickOutside } from '@renderer/shared/hooks';
import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import { AccountDS } from '@renderer/services/storage';
import Wallets from '../Wallets/Wallets';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import './Navigation.css';
import { MultisigTxInitStatus } from '@renderer/domain/transaction';
import { toAddress } from '@renderer/shared/utils/address';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain } from '@renderer/domain/chain';
import { SS58_DEFAULT_PREFIX } from '@renderer/shared/utils/constants';
import NavItem, { Props as NavItemProps } from '../NavItem/NavItem';

type CardType = SigningType | 'multiple' | 'none';

const CardStyle: Record<CardType, string> = {
  [SigningType.WATCH_ONLY]: 'bg-alert border-[3px] border-alert',
  [SigningType.PARITY_SIGNER]: 'bg-primary border-[3px] border-primary',
  [SigningType.MULTISIG]: 'bg-tertiary-variant border-[3px] border-tertiary-variant',
  multiple: 'bg-shade-40 multiple-card',
  none: 'bg-shade-40 border-[3px] border-shade-40',
};

const getCardType = (accounts: AccountDS[]): CardType => {
  if (accounts.length === 0) return 'none';
  if (accounts.length > 1) return 'multiple';

  return accounts[0].signingType;
};

const Navigation = () => {
  const { t } = useI18n();
  const { getActiveAccounts } = useAccount();
  const { getChainsData } = useChains();
  const { getLiveAccountMultisigTxs } = useMultisigTx();

  const walletsRef = useRef<HTMLDivElement>(null);
  const showWalletsRef = useRef<HTMLButtonElement>(null);

  const [chainsObject, setChainsObject] = useState<Record<ChainId, Chain>>({});
  const [isWalletsOpen, setIsWalletsOpen] = useState(false);

  const activeAccounts = getActiveAccounts();
  const cardType = getCardType(activeAccounts);

  useEffect(() => {
    getChainsData().then((chains) => setChainsObject(keyBy(chains, 'chainId')));
  }, []);

  const txs = getLiveAccountMultisigTxs(activeAccounts.map((a) => a.accountId)).filter(
    (tx) => tx.status === MultisigTxInitStatus.SIGNING,
  );

  const NavItems: NavItemProps[] = [
    { icon: 'asset', title: 'navigation.balancesLabel', link: Paths.BALANCES },
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

  useClickOutside([walletsRef, showWalletsRef], () => {
    setIsWalletsOpen(false);
  });

  const currentAccount = activeAccounts[0];
  const addressPrefix = activeAccounts[0]?.chainId
    ? chainsObject[activeAccounts[0].chainId].addressPrefix
    : SS58_DEFAULT_PREFIX;

  const accountName =
    cardType === 'multiple'
      ? t('navigation.multipleWalletsLabel')
      : currentAccount?.name || t('navigation.unknownWalletLabel');

  return (
    <>
      <aside
        className={cn(
          'relative flex gap-y-5 flex-col w-[240px] p-4 z-30',
          'bg-left-navigation-menu-background border-r border-r-container-border',
        )}
      >
        <div className={cn('rounded-xl text-white p-4', CardStyle[cardType])}>
          <div className="flex gap-x-2.5">
            <div className="relative">
              {cardType === SigningType.PARITY_SIGNER && (
                <>
                  <Identicon address={toAddress(currentAccount?.accountId, { prefix: addressPrefix })} size={46} />

                  <div className="absolute box-border right-0 bottom-0 bg-shade-70 w-5 h-5 flex justify-center items-center rounded-full border border-primary border-solid">
                    <Icon name="paritySigner" size={12} />
                  </div>
                </>
              )}
              {cardType === SigningType.WATCH_ONLY && (
                <>
                  <Identicon address={toAddress(currentAccount?.accountId, { prefix: addressPrefix })} size={46} />

                  <div className="absolute box-border right-0 bottom-0 bg-shade-70 w-5 h-5 flex justify-center items-center rounded-full border border-alert border-solid">
                    <Icon name="watchOnly" size={12} />
                  </div>
                </>
              )}
              {cardType === SigningType.MULTISIG && (
                <>
                  <Identicon address={toAddress(currentAccount?.accountId, { prefix: addressPrefix })} size={46} />

                  <div className="absolute right-0 bottom-0 bg-shade-70 w-5 h-5 flex justify-center items-center rounded-full">
                    <Icon name="multisigBg" size={20} />
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
          <ul className="pr-2.5 flex flex-col gap-2">
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

      <Wallets
        ref={walletsRef}
        className={cn(
          'ease-in-out transition-all transform duration-200 absolute z-20 w-[350px] left-0 top-0 overflow-y-auto',
          isWalletsOpen ? 'translate-x-[240px] opacity-100 visible' : 'translate-x-0 opacity-0 invisible',
        )}
        onUrlChange={() => setIsWalletsOpen(false)}
      />
    </>
  );
};

export default Navigation;
