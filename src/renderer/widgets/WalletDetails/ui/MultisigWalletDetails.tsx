import { useMemo } from 'react';

import { MultisigAccount, Signatory, Wallet, AccountId } from '@renderer/shared/core';
import { BaseModal, FootnoteText, Tabs } from '@renderer/shared/ui';
import { RootExplorers } from '@renderer/shared/lib/utils';
import { useModalClose } from '@renderer/shared/lib/hooks';
import { AccountsList, ContactItem, ExplorersPopover, WalletCardLg, WalletCardMd } from '@renderer/entities/wallet';
import { chainsService } from '@renderer/entities/network';
import { useI18n, useMatrix } from '@renderer/app/providers';
// TODO: think about combining balances and wallets
import { WalletFiatBalance } from '@renderer/features/wallets/WalletSelect/ui/WalletFiatBalance';

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

  const chains = useMemo(() => {
    const chains = chainsService.getChainsData();

    return chainsService.sortChains(chains);
  }, []);

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal"
      title={t('walletDetails.common.title')}
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <div className="flex flex-col w-full">
        <div className="py-5 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>

        <Tabs
          unmount={false}
          tabsClassName="mx-4 mt-4"
          items={[
            {
              id: 1,
              title: t('walletDetails.multisig.networksTab'),
              panel: <AccountsList accountId={account.accountId} chains={chains} className="h-[365px]" />,
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
                          {t('walletDetails.multisig.walletsGroup')}
                        </FootnoteText>

                        <ul className="flex flex-col gap-y-2 px-3">
                          {signatoryWallets.map(([accountId, wallet]) => (
                            <li key={wallet.id} className="flex items-center gap-x-2 py-1.5">
                              <ExplorersPopover
                                explorers={RootExplorers}
                                address={accountId}
                                button={
                                  <WalletCardMd
                                    wallet={wallet}
                                    description={<WalletFiatBalance walletId={wallet.id} className="truncate" />}
                                  />
                                }
                              >
                                {isLoggedIn && (
                                  <ExplorersPopover.Group title={t('general.explorers.matrixIdTitle')}>
                                    <FootnoteText className="text-text-secondary">{matrix.userId}</FootnoteText>
                                  </ExplorersPopover.Group>
                                )}
                              </ExplorersPopover>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {signatoryContacts.length > 0 && (
                      <div className="flex flex-col gap-y-2 mt-4 px-5">
                        <FootnoteText className="text-text-tertiary">
                          {t('walletDetails.multisig.contactsGroup')}
                        </FootnoteText>

                        <ul className="flex flex-col gap-y-2">
                          {signatoryContacts.map((signatory) => (
                            <li key={signatory.accountId} className="flex items-center gap-x-2 py-1.5">
                              <ContactItem
                                name={signatory.name}
                                accountId={signatory.accountId}
                                explorers={RootExplorers}
                              />
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
    </BaseModal>
  );
};
