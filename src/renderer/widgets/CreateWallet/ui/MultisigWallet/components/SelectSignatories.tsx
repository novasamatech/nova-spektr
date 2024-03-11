import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { cnTw, includes, toAddress, RootExplorers } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { Button, Checkbox, FootnoteText, Icon, SearchInput, SmallTitleText, Tabs, Tooltip, HelpText } from '@shared/ui';
import { TabItem } from '@shared/ui/types';
import { CreateContactModal } from '@widgets/ManageContactModal';
import { ExtendedContact, ExtendedWallet } from '../common/types';
import { EmptyContactList } from '@entities/contact';
import { type Contact, type Wallet, type Account, type MultisigAccount, WalletType } from '@shared/core';
import { ContactItem, ExplorersPopover, accountUtils, walletUtils } from '@entities/wallet';
import { WalletItem } from './WalletItem';
import { matrixModel } from '@entities/matrix';

const enum SignatoryTabs {
  WALLETS = 'wallets',
  CONTACTS = 'contacts',
}

type Props = {
  isActive: boolean;
  wallets: Wallet[];
  accounts: (Account | MultisigAccount)[];
  contacts: Contact[];
  onSelect: (wallets: ExtendedWallet[], contacts: ExtendedContact[]) => void;
};

export const SelectSignatories = ({ isActive, wallets, accounts, contacts, onSelect }: Props) => {
  const { t } = useI18n();

  const matrix = useUnit(matrixModel.$matrix);
  const loginStatus = useUnit(matrixModel.$loginStatus);

  const [query, setQuery] = useState('');
  const [contactList, setContactList] = useState<ExtendedContact[]>([]);
  const [availableWallets, setAvailableWallets] = useState<ExtendedWallet[]>([]);
  const [disabledWallets, setDisabledWallets] = useState<Wallet[]>([]);
  const [isContactModalOpen, toggleContactModalOpen] = useToggle();

  const [selectedWallets, setSelectedWallets] = useState<Record<string, ExtendedWallet>>({});
  const [selectedContacts, setSelectedContacts] = useState<Record<string, ExtendedContact>>({});

  const selectedWalletsList = Object.values(selectedWallets);
  const selectedContactsList = Object.values(selectedContacts);

  useEffect(() => {
    if (accounts.length === 0) return;

    const addressBookContacts = contacts
      .filter((c) => c.matrixId)
      .map((contact, index) => ({ ...contact, index: index.toString() }));

    const { available, disabled } = wallets.reduce<{
      available: ExtendedWallet[];
      disabled: Wallet[];
    }>(
      (acc, wallet, index) => {
        const walletAccounts = accounts.filter((a) => a.walletId === wallet.id);

        // TODO: Check why it can be empty
        const accountId = walletAccounts[0]?.accountId;
        const isSameAccounts = walletAccounts.every((a) => a.accountId === accountId);
        const isEvmAccount = accountUtils.isEthereumBased(walletAccounts[0]);

        if (isSameAccounts && !isEvmAccount && walletUtils.isValidSignatory(wallet)) {
          acc.available.push({
            ...wallet,
            index: index.toString(),
            address: toAddress(accountId),
            accountId: accountId,
            matrixId: matrix.userId,
          });
        } else {
          acc.disabled.push(wallet);
        }

        return acc;
      },
      { available: [], disabled: [] },
    );

    setContactList(addressBookContacts);
    setAvailableWallets(available);
    setDisabledWallets(disabled);
  }, [accounts.length, contacts.length, wallets.length, loginStatus]);

  useEffect(() => {
    onSelect(selectedWalletsList, selectedContactsList);
  }, [selectedWalletsList.length, selectedContactsList.length]);

  const selectWallet = (wallet: ExtendedWallet) => {
    setSelectedWallets((selectedWallets) => {
      if (selectedWallets[wallet.id]) {
        const { [wallet.id]: removedWallet, ...newWallets } = selectedWallets;

        return newWallets;
      }

      return { ...selectedWallets, [wallet.id]: wallet };
    });
  };

  const selectContact = (contact: ExtendedContact) => {
    setSelectedContacts((selectedContacts) => {
      if (selectedContacts[contact.index]) {
        const { [contact.index]: removedContact, ...newContacts } = selectedContacts;

        return newContacts;
      }

      return { ...selectedContacts, [contact.index]: contact };
    });
  };

  const isDisabledContact = (contact: ExtendedContact): boolean => {
    const isThisContact = selectedContactsList.includes(contact);
    const isSameContactSelected = selectedContactsList.some((c) => c.accountId === contact.accountId);
    const isSameWalletSelected = selectedWalletsList.some((w) => w.accountId === contact.accountId);

    return !isThisContact && (isSameContactSelected || isSameWalletSelected);
  };

  const isDisabledWallet = (wallet: ExtendedWallet): boolean => {
    const isThisWallet = selectedWalletsList.includes(wallet);
    const isSameContactSelected = selectedContactsList.some((c) => c.accountId === wallet.accountId);
    const isSameWalletSelected = selectedWalletsList.some((w) => w.accountId === wallet.accountId);

    return !isThisWallet && (isSameContactSelected || isSameWalletSelected);
  };

  const searchedContactList = contactList.filter((c) => {
    return includes(c.address, query) || includes(c.matrixId, query) || includes(c.name, query);
  });

  const getDisabledMessage = (type: WalletType) => {
    const UnsupportedTypes = [WalletType.WATCH_ONLY, WalletType.MULTISIG, WalletType.PROXIED];
    if (UnsupportedTypes.includes(type)) {
      return t('createMultisigAccount.disabledError.unsupportedType');
    }

    return t('createMultisigAccount.disabledError.differentAccounts');
  };

  const hasWallets = Boolean(availableWallets.length);
  const hasContacts = Boolean(contactList.length);

  const selectedWalletsLength = Object.values(selectedWallets).length;
  const selectedContactsLength = Object.values(selectedContacts).length;

  const WalletsTab = hasWallets ? (
    <div className="flex flex-col gap-2">
      {Boolean(disabledWallets) && (
        <FootnoteText className="text-text-tertiary px-2">{t('createMultisigAccount.availableLabel')}</FootnoteText>
      )}

      <ul className="flex flex-col gap-y-2">
        {availableWallets.map((wallet) => {
          const disabled = isDisabledWallet(wallet);

          return (
            <li
              key={wallet.id + '_wallets'}
              className={cnTw('py-1.5 px-2 rounded-md', !disabled && 'hover:bg-action-background-hover')}
            >
              <Checkbox
                checked={!!selectedWallets[wallet.id]}
                disabled={disabled}
                onChange={() => selectWallet(wallet)}
              >
                <WalletItem name={wallet.name} type={wallet.type || WalletType.POLKADOT_VAULT} />
              </Checkbox>
            </li>
          );
        })}
      </ul>

      {Boolean(disabledWallets.length) && (
        <FootnoteText className="text-text-tertiary px-2">{t('createMultisigAccount.disabledLabel')}</FootnoteText>
      )}

      <ul className="gap-y-2">
        {disabledWallets.map(({ id, name, type }) => (
          <li key={id + '_wallets'} className="py-1.5 px-2 rounded-md">
            <Tooltip offsetPx={-65} content={getDisabledMessage(type)}>
              <Checkbox disabled>
                <WalletItem name={name} type={type} />
              </Checkbox>
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <EmptyContactList description={t('createMultisigAccount.noWalletsLabel')} />
  );

  const ContactsTab = (
    <div>
      <div className="flex items-center gap-x-4 mb-4 px-2">
        <SearchInput
          wrapperClass="flex-1"
          placeholder={t('createMultisigAccount.searchContactPlaceholder')}
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
          {searchedContactList.map((contact) => {
            const disabled = isDisabledContact(contact);

            return (
              <li
                key={contact.index + '_contacts'}
                className={cnTw('py-1.5 px-2 rounded-md', !disabled && 'hover:bg-action-background-hover')}
              >
                <Checkbox
                  checked={Boolean(selectedContacts[contact.index]) || false}
                  disabled={disabled}
                  onChange={() => selectContact(contact)}
                >
                  <ExplorersPopover
                    address={contact.accountId}
                    explorers={RootExplorers}
                    button={<ContactItem name={contact.name} address={contact.accountId} />}
                  >
                    <ExplorersPopover.Group
                      active={Boolean(contact.matrixId)}
                      title={t('general.explorers.matrixIdTitle')}
                    >
                      <HelpText className="text-text-secondary break-all">{contact.matrixId}</HelpText>
                    </ExplorersPopover.Group>
                  </ExplorersPopover>
                </Checkbox>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyContactList onNewContact={toggleContactModalOpen} />
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
      <div className={cnTw('max-h-full flex flex-col flex-1', !isActive && 'hidden')}>
        <SmallTitleText className="py-2 px-2 mb-4">{t('createMultisigAccount.signatoryTitle')}</SmallTitleText>

        <Tabs
          items={TabItems}
          unmount={false}
          panelClassName="mt-4 flex-1 overflow-y-auto"
          tabClassName="flex-inline"
          tabsClassName="mx-2"
        />
      </div>

      <CreateContactModal isOpen={isContactModalOpen} onClose={toggleContactModalOpen} />
    </>
  );
};
