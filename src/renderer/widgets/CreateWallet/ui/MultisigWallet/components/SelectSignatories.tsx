import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { cnTw, isEthereumAccountId } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { Button, Icon } from '@shared/ui';
import { ExtendedAccount, ExtendedContact } from '../common/types';
import { type Contact, type Account, ShardAccount, Wallet, Chain } from '@shared/core';
import { networkUtils } from '@entities/network';
import { signatoryModel } from '../../../model/signatory-model';
import { Signatory } from './Signatory';

type Props = {
  isActive: boolean;
  accounts: (Account | ShardAccount[])[];
  wallets: Record<Wallet['id'], Wallet>;
  contacts: Contact[];
  chain?: Chain;
  onSelect: (accounts: ExtendedAccount[], contacts: ExtendedContact[]) => void;
};

export const SelectSignatories = ({ isActive, accounts, wallets, contacts, chain, onSelect }: Props) => {
  const { t } = useI18n();

  const [contactList, setContactList] = useState<ExtendedContact[]>([]);
  const [accountsList, setAccountsList] = useState<Record<Wallet['id'], Array<ExtendedAccount | ExtendedAccount[]>>>(
    {},
  );
  const [isContactModalOpen, toggleContactModalOpen] = useToggle();

  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, ExtendedAccount>>({});
  const [selectedContacts, setSelectedContacts] = useState<Record<string, ExtendedContact>>({});

  const selectedAccountsList = Object.values(selectedAccounts);
  const selectedContactsList = Object.values(selectedContacts);
  const signatories = useUnit(signatoryModel.$signatories);

  useEffect(() => {
    const addressBookContacts = contacts
      .filter((c) => {
        const isEthereumContact = isEthereumAccountId(c.accountId);
        const isEthereumChain = networkUtils.isEthereumBased(chain?.options);

        return isEthereumContact === isEthereumChain;
      })
      .map((contact, index) => ({ ...contact, index: index.toString() }));

    setContactList(addressBookContacts);
  }, [contacts.length, chain]);

  //       return !isEthereumAccountId(c.accountId);
  //     })
  //     .map((contact, index) => ({ ...contact, index: index.toString() }));

  //   const { available, disabled } = wallets.reduce<{
  //     available: ExtendedWallet[];
  //     disabled: Wallet[];
  //   }>(
  //     (acc, wallet, index) => {
  //       const walletAccounts = accounts.filter((a) => a.walletId === wallet.id);

  //       if (!walletAccounts.length) return acc;

  //       // TODO: Check why it can be empty
  //       const accountId = walletAccounts[0]?.accountId;
  //       const isSameAccounts = walletAccounts.every((a) => a.accountId === accountId);
  //       const isEvmAccount = accountUtils.isEthereumBased(walletAccounts[0]);

  //       if (isSameAccounts && !isEvmAccount && walletUtils.isValidSignatory(wallet)) {
  //         acc.available.push({
  //           ...wallet,
  //           index: index.toString(),
  //           address: toAddress(accountId),
  //           accountId: accountId,
  //         });
  //       } else {
  //         acc.disabled.push(wallet);
  //       }

  //       return acc;
  //     },
  //     { available: [], disabled: [] },
  //   );

  //   setContactList(addressBookContacts);
  //   setAvailableWallets(available);
  //   setDisabledWallets(disabled);
  // }, [accounts.length, contacts.length, wallets.length]);

  useEffect(() => {
    setSelectedAccounts({});
    setSelectedContacts({});
  }, [chain]);

  useEffect(() => {
    onSelect(selectedAccountsList, selectedContactsList);
  }, [selectedAccountsList.length, selectedContactsList.length]);

  const onAddSignatoryClick = () => {
    signatoryModel.events.signatoriesChanged({ index: signatories.size, name: '', address: '' });
  };

  const onDeleteSignatoryClick = (index: number) => {
    signatoryModel.events.signatoryDeleted(index);
  };

  return (
    <div className={cnTw('max-h-full flex flex-col flex-1', !isActive && 'hidden')}>
      <div className="flex flex-col gap-2">
        {Array.from(signatories.keys()).map((key) => (
          <Signatory key={key} index={key} canBeDeleted={key !== 0} onDelete={() => onDeleteSignatoryClick(key)} />
        ))}
      </div>
      <div>
        <Button
          size="sm"
          variant="text"
          className="mt-4 h-8.5 justify-center"
          suffixElement={<Icon name="add" size={16} />}
          onClick={onAddSignatoryClick}
        >
          {t('createMulisigAccount.addNewSignatory')}
        </Button>
      </div>
    </div>
  );
};
