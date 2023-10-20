import { useMemo } from 'react';
import { useUnit } from 'effector-react';

import { Wallet, MultisigAccount } from '@renderer/shared/core';
import { BaseModal, BodyText, Tabs, FootnoteText } from '@renderer/shared/ui';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import { AccountsList, WalletIcon, AddressWithName } from '@renderer/entities/wallet';
import { chainsService } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';
import { walletProviderModel } from '../model/wallet-provider-model';
import { WalletFiatBalance } from '@renderer/features/wallets/WalletSelect/ui/WalletFiatBalance';

type Props = {
  isOpen: boolean;
  wallet: Wallet;
  account: MultisigAccount;
  onClose: () => void;
};
export const MultisigWalletDetails = ({ isOpen, wallet, account, onClose }: Props) => {
  const { t } = useI18n();

  const contacts = useUnit(walletProviderModel.$contacts);
  const signatoryWallets = useUnit(walletProviderModel.$signatoryWallets);

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  const chains = useMemo(() => {
    const chains = chainsService.getChainsData();

    return chainsService.sortChains(chains);
  }, []);

  const closeWowModal = () => {
    toggleIsModalOpen();

    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal"
      title={t('walletDetails.common.title')}
      isOpen={isModalOpen}
      onClose={closeWowModal}
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-x-2 py-5 px-5 border-b border-divider">
          <WalletIcon type={wallet.type} size={32} />
          <BodyText>{wallet.name}</BodyText>
        </div>

        <Tabs
          unmount={false}
          tabsClassName="mx-4 mt-4"
          items={[
            {
              id: 1,
              title: 'Networks',
              panel: <AccountsList accountId={account.accountId} chains={chains} className="h-[349px]" />,
            },
            {
              id: 2,
              title: 'Signatories',
              panel: (
                <div className="flex flex-col px-5">
                  <FootnoteText className="text-text-tertiary">
                    Threshold {account.threshold} out of {account.signatories.length}
                  </FootnoteText>

                  <div className="overflow-y-auto mt-4 max-h-[357px]">
                    {signatoryWallets.length > 0 && (
                      <div className="flex flex-col gap-y-2">
                        <FootnoteText className="text-text-tertiary">Your wallets</FootnoteText>

                        <ul className="flex flex-col gap-y-2">
                          {signatoryWallets.map((wallet) => (
                            <li key={wallet.id} className="flex items-center gap-x-2 py-1.5">
                              <WalletIcon className="shrink-0" type={wallet.type} size={20} />

                              <div className="flex flex-col gap-y-1 overflow-hidden">
                                <BodyText className="text-text-secondary truncate">{wallet.name}</BodyText>
                                <WalletFiatBalance walletId={wallet.id} className="truncate" />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {contacts.length > 0 && (
                      <div className="flex flex-col gap-y-2 mt-4">
                        <FootnoteText className="text-text-tertiary">Contacts</FootnoteText>

                        <ul className="flex flex-col gap-y-2">
                          {contacts.map((contact) => (
                            <li key={contact.accountId} className="flex items-center gap-x-2 py-1.5">
                              <AddressWithName
                                name={contact.name}
                                size={20}
                                accountId={contact.accountId}
                                // explorers={RootExplorers}
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
