import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { type AccountId, type MultisigWallet, type Signatory, type Wallet } from '@shared/core';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { RootExplorers } from '@shared/lib/utils';
import { BaseModal, DropdownIconButton, FootnoteText, HelpText, Tabs } from '@shared/ui';
import { type IconNames } from '@shared/ui/Icon/data';
import { type TabItem } from '@shared/ui/types';
import { matrixModel, matrixUtils } from '@entities/matrix';
import { networkModel, networkUtils } from '@entities/network';
import {
  AccountsList,
  ContactItem,
  ExplorersPopover,
  WalletCardLg,
  WalletCardMd,
  accountUtils,
  permissionUtils,
} from '@entities/wallet';
import { ForgetWalletModal } from '@features/wallets/ForgetWallet';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { WalletFiatBalance } from '@features/wallets/WalletSelect/ui/WalletFiatBalance';
import { AddProxy, addProxyModel } from '@widgets/AddProxyModal';
import { AddPureProxied, addPureProxiedModel } from '@widgets/AddPureProxiedModal';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';

type Props = {
  wallet: MultisigWallet;
  signatoryWallets: [AccountId, Wallet][];
  signatoryContacts: Signatory[];
  signatoryAccounts: Signatory[];
  onClose: () => void;
};
export const MultisigWalletDetails = ({
  wallet,
  signatoryWallets = [],
  signatoryContacts = [],
  signatoryAccounts = [],
  onClose,
}: Props) => {
  const { t } = useI18n();

  const matrix = useUnit(matrixModel.$matrix);
  const loginStatus = useUnit(matrixModel.$loginStatus);

  const chains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletProviderModel.$hasProxies);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const multisigAccount = wallet.accounts[0];
  const singleChain = multisigAccount.chainId && chains[multisigAccount.chainId];
  const explorers = singleChain?.explorers || RootExplorers;

  const multisigChains = useMemo(() => {
    return Object.values(chains).filter((chain) => {
      return (
        networkUtils.isMultisigSupported(chain.options) && accountUtils.isChainAndCryptoMatch(multisigAccount, chain)
      );
    });
  }, [chains]);

  const canCreateProxy = useMemo(() => {
    const anyProxy = permissionUtils.canCreateAnyProxy(wallet);
    const nonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);

    if (!singleChain) {
      return anyProxy || nonAnyProxy;
    }

    return (anyProxy || nonAnyProxy) && networkUtils.isProxySupported(singleChain?.options);
  }, [singleChain]);

  const canCreatePureProxy = useMemo(() => {
    const anyProxy = permissionUtils.canCreateAnyProxy(wallet);

    if (!singleChain) {
      return anyProxy;
    }

    return anyProxy && networkUtils.isPureProxySupported(singleChain?.options);
  }, [singleChain]);

  const Options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
    {
      icon: 'forget' as IconNames,
      title: t('walletDetails.common.forgetButton'),
      onClick: toggleConfirmForget,
    },
  ];

  if (canCreateProxy) {
    Options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxyModel.events.flowStarted,
    });
  }

  if (canCreatePureProxy) {
    Options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addPureProxiedAction'),
      onClick: addPureProxiedModel.events.flowStarted,
    });
  }

  const ActionButton = (
    <DropdownIconButton name="more">
      <DropdownIconButton.Items>
        {Options.map((option) => (
          <DropdownIconButton.Item key={option.title}>
            <DropdownIconButton.Option option={option} />
          </DropdownIconButton.Item>
        ))}
      </DropdownIconButton.Items>
    </DropdownIconButton>
  );

  const TabAccountList = {
    id: 1,
    title: t('walletDetails.multisig.networksTab'),
    panel: <AccountsList accountId={multisigAccount.accountId} chains={multisigChains} className="h-[345px]" />,
  };

  const TabSignatories = {
    id: 2,
    title: t('walletDetails.multisig.signatoriesTab'),
    panel: (
      <div className="flex flex-col">
        <FootnoteText className="px-5 text-text-tertiary">
          {t('walletDetails.multisig.thresholdLabel', {
            min: multisigAccount.threshold,
            max: multisigAccount.signatories.length,
          })}
        </FootnoteText>

        <div className="mt-4 h-[337px] overflow-y-auto">
          {!singleChain && signatoryWallets.length > 0 && (
            <div className="flex flex-col gap-y-2">
              <FootnoteText className="px-5 text-text-tertiary">
                {t('walletDetails.multisig.walletsGroup')} {signatoryWallets.length}
              </FootnoteText>

              <ul className="flex flex-col gap-y-2 px-3">
                {signatoryWallets.map(([accountId, wallet]) => (
                  <li key={wallet.id} className="flex items-center gap-x-2 py-1.5">
                    <ExplorersPopover
                      address={accountId}
                      explorers={explorers}
                      button={
                        <WalletCardMd
                          wallet={wallet}
                          description={<WalletFiatBalance walletId={wallet.id} className="truncate" />}
                        />
                      }
                    >
                      <ExplorersPopover.Group
                        active={matrixUtils.isLoggedIn(loginStatus)}
                        title={t('general.explorers.matrixIdTitle')}
                      >
                        <HelpText className="text-text-secondary">{matrix.userId}</HelpText>
                      </ExplorersPopover.Group>
                    </ExplorersPopover>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {singleChain && signatoryAccounts?.length && (
            <div className="flex flex-col gap-y-2 px-5">
              <FootnoteText className="text-text-tertiary">
                {t('walletDetails.multisig.accountsGroup')} {signatoryAccounts.length}
              </FootnoteText>

              <ul className="flex flex-col gap-y-2">
                {signatoryAccounts.map((signatory) => (
                  <li key={signatory.accountId} className="flex items-center gap-x-2 py-1.5">
                    <ExplorersPopover
                      address={signatory.accountId}
                      explorers={RootExplorers}
                      button={
                        <ContactItem
                          name={signatory.name}
                          address={signatory.accountId}
                          addressPrefix={singleChain.addressPrefix}
                        />
                      }
                    >
                      <ExplorersPopover.Group
                        active={matrixUtils.isLoggedIn(loginStatus)}
                        title={t('general.explorers.matrixIdTitle')}
                      >
                        <HelpText className="text-text-secondary">{matrix.userId}</HelpText>
                      </ExplorersPopover.Group>
                    </ExplorersPopover>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {signatoryContacts.length > 0 && (
            <div className="mt-4 flex flex-col gap-y-2 px-5">
              <FootnoteText className="text-text-tertiary">
                {t('walletDetails.multisig.contactsGroup')} {signatoryContacts.length}
              </FootnoteText>

              <ul className="flex flex-col gap-y-2">
                {signatoryContacts.map((signatory) => (
                  <li key={signatory.accountId} className="flex items-center gap-x-2 py-1.5">
                    <ExplorersPopover
                      address={signatory.accountId}
                      explorers={explorers}
                      button={<ContactItem name={signatory.name} address={signatory.accountId} />}
                    >
                      <ExplorersPopover.Group
                        active={Boolean(signatory.matrixId)}
                        title={t('general.explorers.matrixIdTitle')}
                      >
                        <HelpText className="break-all text-text-secondary">{signatory.matrixId}</HelpText>
                      </ExplorersPopover.Group>
                    </ExplorersPopover>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    ),
  };

  const TabProxy = {
    id: 3,
    title: t('walletDetails.common.proxiesTabTitle'),
    panel: hasProxies ? (
      <ProxiesList className="h-[371px]" canCreateProxy={canCreateProxy} />
    ) : (
      <NoProxiesAction
        className="h-[371px]"
        canCreateProxy={canCreateProxy}
        onAddProxy={addProxyModel.events.flowStarted}
      />
    ),
  };

  const TabItems: TabItem[] = [TabAccountList, TabSignatories];

  if (canCreateProxy) {
    TabItems.push(TabProxy);
  }

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal w-[448px]"
      title={t('walletDetails.common.title')}
      actionButton={ActionButton}
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <div className="flex w-full flex-col gap-y-4">
        <div className="border-b border-divider px-5 py-6">
          <WalletCardLg wallet={wallet} />
        </div>

        <Tabs unmount={false} tabClassName="whitespace-nowrap" tabsClassName="mx-4" items={TabItems} />
      </div>

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <ForgetWalletModal
        wallet={wallet}
        isOpen={isConfirmForgetOpen}
        onClose={toggleConfirmForget}
        onForget={onClose}
      />

      <AddProxy />
      <AddPureProxied />
    </BaseModal>
  );
};
