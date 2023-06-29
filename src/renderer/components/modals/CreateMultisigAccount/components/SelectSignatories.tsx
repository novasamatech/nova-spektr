import { useState, useEffect } from 'react';
import cn from 'classnames';
import { keyBy } from 'lodash';

import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import { includes } from '@renderer/shared/utils/strings';
import { toAddress } from '@renderer/shared/utils/address';
import { AccountId } from '@renderer/domain/shared-kernel';
import { ChainsRecord } from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { useToggle } from '@renderer/shared/hooks';
import { WalletsTabItem } from './WalletsTabItem';
import { Icon } from '@renderer/components/ui';
import { EmptyContacts } from '@renderer/screens/AddressBook/Overview/components';
import { isWalletContact, Account, MultisigAccount } from '@renderer/domain/account';
import { ContactForm } from '@renderer/components/forms';
import { TabItem } from '@renderer/components/ui-redesign/Tabs/common/types';
import { Contact } from '@renderer/domain/contact';
import { WalletDS } from '@renderer/services/storage';
import cnTw from '@renderer/shared/utils/twMerge';
import { ExtendedWallet, ExtendedContact } from '../common/types';
import {
  FootnoteText,
  SearchInput,
  SmallTitleText,
  Checkbox,
  Button,
  BaseModal,
  Tabs,
} from '@renderer/components/ui-redesign';

const enum SignatoryTabs {
  WALLETS = 'wallets',
  CONTACTS = 'contacts',
}

type SelectedObject = {
  [key: AccountId]: {
    [index: string]: boolean;
  };
};

type Props = {
  isActive: boolean;
  chains: ChainsRecord;
  wallets: WalletDS[];
  accounts: (Account | MultisigAccount)[];
  contacts: Contact[];
  onSelect: (wallets: ExtendedWallet[], contacts: ExtendedContact[]) => void;
};

export const SelectSignatories = ({ isActive, chains, wallets, accounts, contacts, onSelect }: Props) => {
  const { t } = useI18n();
  const { matrix } = useMatrix();

  const [query, setQuery] = useState('');
  const [contactList, setContactList] = useState<ExtendedContact[]>([]);
  const [walletList, setWalletList] = useState<ExtendedWallet[]>([]);
  const [isContactModalOpen, toggleContactModalOpen] = useToggle();

  const [selectedWallets, setSelectedWallets] = useState<SelectedObject>({});
  const [selectedContacts, setSelectedContacts] = useState<SelectedObject>({});

  useEffect(() => {
    const walletMap = keyBy(wallets, 'id');
    const addressBookContacts = contacts
      .filter((c) => c.matrixId)
      .map((contact, index) => ({ ...contact, index: index.toString() }));

    const walletContacts = accounts.reduce<ExtendedWallet[]>((acc, a, index) => {
      if (isWalletContact(a)) {
        acc.push({
          index: index.toString(),
          name: a.name || a.accountId,
          address: toAddress(a.accountId),
          accountId: a.accountId,
          matrixId: matrix.userId,
          chainId: a.chainId,
          walletName: walletMap[a.walletId || '']?.name,
        });
      }

      return acc;
    }, []);

    setWalletList(walletContacts);
    setContactList(addressBookContacts);
  }, [accounts.length, contacts.length, wallets.length]);

  const selectSignatory = (tab: SignatoryTabs, index: string, accountId: AccountId, selection: SelectedObject) => {
    const newValue = !selection[accountId]?.[index];

    const newSelectedValues: SelectedObject = {
      ...selection,
      [accountId]: { ...selection[accountId], [index]: newValue },
    };

    const selectionForWallets = tab === SignatoryTabs.WALLETS ? newSelectedValues : selectedWallets;
    const selectionForContacts = tab === SignatoryTabs.CONTACTS ? newSelectedValues : selectedContacts;

    const newWallets = walletList.filter((w) => selectionForWallets[w.accountId]?.[w.index]);
    const newContacts = contactList.filter((c) => selectionForContacts[c.accountId]?.[c.index]);

    if (tab === SignatoryTabs.WALLETS) setSelectedWallets(newSelectedValues);
    if (tab === SignatoryTabs.CONTACTS) setSelectedContacts(newSelectedValues);

    onSelect(newWallets, newContacts);
  };

  const isSameItemSelected = (index: string, selectionMap?: { [index: string]: boolean }): boolean => {
    if (!selectionMap) return false;

    return Object.entries(selectionMap).some(([key, value]) => {
      return key === index ? false : value;
    });
  };

  const searchedContactList = contactList.filter((c) => {
    return includes(c.address, query) || includes(c.matrixId, query) || includes(c.name, query);
  });

  const hasWallets = Boolean(walletList.length);
  const hasContacts = Boolean(contactList.length);

  const selectedWalletsLength = Object.values(selectedWallets).reduce((acc, w) => {
    return acc + Object.values(w).reduce((total, flag) => total + (flag ? 1 : 0), 0);
  }, 0);
  const selectedContactsLength = Object.values(selectedContacts).reduce((acc, c) => {
    return acc + Object.values(c).reduce((total, flag) => total + (flag ? 1 : 0), 0);
  }, 0);

  const WalletsTab = hasWallets ? (
    <ul className="gap-y-2">
      {walletList.map(({ index, accountId, name, walletName, chainId }) => (
        <li key={index + 'wallets'} className="p-1 mb-0.5 last:mb-0 rounded-md hover:bg-action-background-hover">
          <Checkbox
            defaultChecked={selectedWallets[accountId]?.[index]}
            checked={selectedWallets[accountId]?.[index]}
            disabled={isSameItemSelected(index, selectedWallets[accountId])}
            onChange={() => selectSignatory(SignatoryTabs.WALLETS, index, accountId, selectedWallets)}
          >
            <WalletsTabItem
              name={name}
              accountId={accountId}
              walletName={walletName}
              explorers={chainId ? chains[chainId]?.explorers : []}
            />
          </Checkbox>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyContacts description={t('createMultisigAccount.noWalletsLabel')} />
  );

  const ContactsTab = (
    <div>
      <div className="flex items-center gap-x-4 flex-1 mb-4">
        <SearchInput
          placeholder={t('createMultisigAccount.searchContactPlaceholder')}
          wrapperClass={cn('flex-1')}
          value={query}
          onChange={setQuery}
        />
        {hasContacts && (
          <Button variant="text" suffixElement={<Icon name="add" size={16} />} onClick={toggleContactModalOpen}>
            {t('createMultisigAccount.addContact')}
          </Button>
        )}
      </div>

      {hasContacts ? (
        <ul className="flex flex-col gap-y-2">
          {searchedContactList.map(({ index, accountId, name }) => (
            <li key={index + 'contacts'} className="p-1 mb-0.5 last:mb-0 rounded-md hover:bg-action-background-hover">
              <Checkbox
                defaultChecked={selectedContacts[accountId]?.[index]}
                checked={selectedContacts[accountId]?.[index]}
                disabled={isSameItemSelected(index, selectedContacts[accountId])}
                onChange={() => selectSignatory(SignatoryTabs.CONTACTS, index, accountId, selectedContacts)}
              >
                <WalletsTabItem name={name} accountId={accountId} />
              </Checkbox>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyContacts onAddContact={toggleContactModalOpen} />
      )}
    </div>
  );

  const TabItems: TabItem[] = [
    {
      id: SignatoryTabs.WALLETS,
      panel: WalletsTab,
      title: (
        <>
          {t('createMultisigAccount.walletsTab')}
          {selectedWalletsLength > 0 && (
            <FootnoteText as="span" className="text-text-tertiary ml-1">
              {selectedWalletsLength}
            </FootnoteText>
          )}
        </>
      ),
    },
    {
      id: SignatoryTabs.CONTACTS,
      panel: ContactsTab,
      title: (
        <>
          {t('createMultisigAccount.contactsTab')}
          {selectedContactsLength > 0 && (
            <FootnoteText as="span" className="text-text-tertiary ml-1">
              {selectedContactsLength}
            </FootnoteText>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <section
        className={cnTw('flex flex-col px-5 py-4 flex-1 bg-input-background-disabled h-full', !isActive && 'hidden')}
      >
        <SmallTitleText className="py-2 mb-4">{t('createMultisigAccount.signatoryTitle')}</SmallTitleText>

        <Tabs items={TabItems} panelClassName="mt-4 flex-1 overflow-y-auto" tabClassName="flex-inline" />
      </section>

      <BaseModal
        closeButton
        isOpen={isContactModalOpen}
        title={t('addressBook.addContact.title')}
        headerClass="py-[15px] px-5"
        contentClass="px-5 pb-4 w-[440px]"
        onClose={toggleContactModalOpen}
      >
        <ContactForm onFormSubmit={toggleContactModalOpen} />
      </BaseModal>
    </>
  );
};
