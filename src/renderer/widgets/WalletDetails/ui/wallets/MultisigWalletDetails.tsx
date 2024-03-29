import { useEffect, useMemo, useState } from 'react';
import { useUnit } from 'effector-react';

import { MultisigAccount, Signatory, Wallet, AccountId, Chain } from '@shared/core';
import { BaseModal, FootnoteText, Tabs, HelpText, DropdownIconButton } from '@shared/ui';
import { RootExplorers } from '@shared/lib/utils';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import {
  AccountsList,
  ContactItem,
  ExplorersPopover,
  WalletCardLg,
  WalletCardMd,
  accountUtils,
} from '@entities/wallet';
import { useI18n } from '@app/providers';
import { WalletFiatBalance } from '@features/wallets/WalletSelect/ui/WalletFiatBalance';
import { IconNames } from '@shared/ui/Icon/data';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { ForgetWalletModal } from '@features/wallets/ForgetWallet';
import { addProxyModel, AddProxy } from '@widgets/AddProxyModal';
import { ProxiesList } from '../components/ProxiesList';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { networkUtils, networkModel } from '@entities/network';
import { matrixModel, matrixUtils } from '@entities/matrix';
import { AddPureProxied, addPureProxiedModel } from '@widgets/AddPureProxiedModal';

type Props = {
  wallet: Wallet;
  account: MultisigAccount;
  signatoryWallets: [AccountId, Wallet][];
  signatoryContacts: Signatory[];
  signatoryAccounts: Signatory[];
  onClose: () => void;
};
export const MultisigWalletDetails = ({
  wallet,
  account,
  signatoryWallets = [],
  signatoryContacts = [],
  signatoryAccounts = [],
  onClose,
}: Props) => {
  const { t } = useI18n();

  const matrix = useUnit(matrixModel.$matrix);
  const loginStatus = useUnit(matrixModel.$loginStatus);

  const allChains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletProviderModel.$hasProxies);
  const canCreateProxy = useUnit(walletProviderModel.$canCreateProxy);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const [chains, setChains] = useState<Chain[]>([]);

  useEffect(() => {
    setChains(Object.values(allChains));
  }, []);

  const chain = account.chainId && allChains[account.chainId];
  const explorers = chain?.explorers || RootExplorers;

  const multisigChains = useMemo(() => {
    return Object.values(chains).filter((chain) => {
      return networkUtils.isMultisigSupported(chain.options) && accountUtils.isChainAndCryptoMatch(account, chain);
    });
  }, [chains]);

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
    {
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxyModel.events.flowStarted,
    },
    {
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addPureProxiedAction'),
      onClick: addPureProxiedModel.events.flowStarted,
    },
  ];

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
      <div className="flex flex-col gap-y-4 w-full">
        <div className="py-6 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>

        <Tabs
          unmount={false}
          tabClassName="whitespace-nowrap"
          tabsClassName="mx-4"
          items={[
            {
              id: 1,
              title: t('walletDetails.multisig.networksTab'),
              panel: <AccountsList accountId={account.accountId} chains={multisigChains} className="h-[345px]" />,
            },
            {
              id: 2,
              title: t('walletDetails.multisig.signatoriesTab'),
              panel: (
                <div className="flex flex-col">
                  <FootnoteText className="text-text-tertiary px-5">
                    {t('walletDetails.multisig.thresholdLabel', {
                      min: account.threshold,
                      max: account.signatories.length,
                    })}
                  </FootnoteText>

                  <div className="overflow-y-auto mt-4 h-[337px]">
                    {!chain && signatoryWallets.length > 0 && (
                      <div className="flex flex-col gap-y-2">
                        <FootnoteText className="text-text-tertiary px-5">
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

                    {chain && signatoryAccounts?.length && (
                      <div className="flex flex-col gap-y-2 px-5">
                        <FootnoteText className="text-text-tertiary ">
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
                                    addressPrefix={chain.addressPrefix}
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
                      <div className="flex flex-col gap-y-2 mt-4 px-5">
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
                                  <HelpText className="text-text-secondary break-all">{signatory.matrixId}</HelpText>
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
            },
            {
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
            },
          ]}
        />
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
