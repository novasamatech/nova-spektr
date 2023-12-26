import { useMemo } from 'react';

import { MultisigAccount, Signatory, Wallet, AccountId } from '@shared/core';
import { BaseModal, FootnoteText, Tabs, HelpText, DropdownIconButton } from '@shared/ui';
import { RootExplorers } from '@shared/lib/utils';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { AccountsList, ContactItem, ExplorersPopover, WalletCardLg, WalletCardMd } from '@entities/wallet';
import { chainsService, isMultisigAvailable } from '@entities/network';
import { useI18n, useMatrix } from '@app/providers';
// TODO: think about combining balances and wallets
import { WalletFiatBalance } from '@features/wallets/WalletSelect/ui/WalletFiatBalance';
import { IconNames } from '@shared/ui/Icon/data';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { ForgetWalletModal } from '@features/wallets/ForgetWallet';

type Props = {
  wallet: Wallet;
  account: MultisigAccount;
  signatoryWallets: [AccountId, Wallet][];
  signatoryContacts: Signatory[];
  onClose: () => void;
};
export const MultisigWalletDetails = ({ wallet, account, signatoryWallets, signatoryContacts, onClose }: Props) => {
  const { t } = useI18n();
  const { matrix, isLoggedIn } = useMatrix();

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const chains = useMemo(() => {
    return chainsService.getChainsData({ sort: true }).filter((chain) => isMultisigAvailable(chain.options));
  }, []);

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

  const ActionButton = (
    <DropdownIconButton name="more">
      <DropdownIconButton.Items>
        {Options.map((option) => (
          <DropdownIconButton.Item key={option.icon}>
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
      panelClass="h-modal"
      title={t('walletDetails.common.title')}
      actionButton={ActionButton}
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <div className="flex flex-col w-full">
        <div className="py-6 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>

        <Tabs
          unmount={false}
          tabsClassName="mx-4 mt-4"
          items={[
            {
              id: 1,
              title: t('walletDetails.multisig.networksTab'),
              panel: <AccountsList accountId={account.accountId} chains={chains} className="h-[355px]" />,
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

                  <div className="overflow-y-auto mt-4 h-[357px]">
                    {signatoryWallets.length > 0 && (
                      <div className="flex flex-col gap-y-2">
                        <FootnoteText className="text-text-tertiary px-5">
                          {t('walletDetails.multisig.walletsGroup')} {signatoryWallets.length}
                        </FootnoteText>

                        <ul className="flex flex-col gap-y-2 px-3">
                          {signatoryWallets.map(([accountId, wallet]) => (
                            <li key={wallet.id} className="flex items-center gap-x-2 py-1.5">
                              <ExplorersPopover
                                address={accountId}
                                explorers={RootExplorers}
                                button={
                                  <WalletCardMd
                                    wallet={wallet}
                                    description={<WalletFiatBalance walletId={wallet.id} className="truncate" />}
                                  />
                                }
                              >
                                <ExplorersPopover.Group
                                  active={isLoggedIn}
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
                                explorers={RootExplorers}
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
    </BaseModal>
  );
};
