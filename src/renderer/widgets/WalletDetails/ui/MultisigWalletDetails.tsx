import { useMemo } from 'react';

import { Wallet, MultisigAccount, Signatory } from '@shared/core';
import { BaseModal, BodyText, Tabs, FootnoteText, Icon, InfoPopover } from '@shared/ui';
import { RootExplorers, toAddress } from '@shared/lib/utils';
import { useModalClose } from '@shared/lib/hooks';
import { AccountsList, WalletIcon, ContactItem, useAddressInfo } from '@entities/wallet';
import { chainsService } from '@entities/network';
import { useI18n } from '@app/providers';
// TODO: think about combining balances and wallets
import { WalletFiatBalance } from '@features/wallets/WalletSelect/ui/WalletFiatBalance';

type Props = {
  wallet: Wallet;
  account: MultisigAccount;
  signatoryWallets: Wallet[];
  signatoryContacts: Signatory[];
  onClose: () => void;
};
export const MultisigWalletDetails = ({ wallet, account, signatoryWallets, signatoryContacts, onClose }: Props) => {
  const { t } = useI18n();

  const popoverItems = useAddressInfo({ address: toAddress(account.accountId), explorers: RootExplorers });

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
                      <div className="flex flex-col gap-y-2 px-5">
                        <FootnoteText className="text-text-tertiary">
                          {t('walletDetails.multisig.walletsGroup')}
                        </FootnoteText>

                        <ul className="flex flex-col gap-y-2">
                          {signatoryWallets.map((wallet) => (
                            <li key={wallet.id} className="flex items-center gap-x-2 py-1.5">
                              <WalletIcon className="shrink-0" type={wallet.type} size={20} />

                              <div className="flex flex-col gap-y-1 overflow-hidden">
                                <BodyText className="text-text-secondary truncate">{wallet.name}</BodyText>
                                <WalletFiatBalance walletId={wallet.id} className="truncate" />
                              </div>

                              <InfoPopover data={popoverItems} containerClassName="ml-auto" position="right-0">
                                <Icon name="info" size={16} className="hover:text-icon-hover" />
                              </InfoPopover>
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
                          {signatoryContacts.map((sigmatory) => (
                            <li key={sigmatory.accountId} className="flex items-center gap-x-2 py-1.5">
                              <ContactItem
                                name={sigmatory.name}
                                accountId={sigmatory.accountId}
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
