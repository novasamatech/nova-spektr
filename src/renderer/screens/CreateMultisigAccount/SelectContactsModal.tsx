import { ChangeEvent, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { BaseModal, Button, Checkbox, Identicon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Signatory } from '@renderer/domain/signatory';
import { useAccount } from '@renderer/services/account/accountService';
import { useContact } from '@renderer/services/contact/contactService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { includes } from '@renderer/shared/utils/strings';
import { Contact } from '@renderer/domain/contact';
import { toAddress } from '@renderer/shared/utils/address';
import { SigningType } from '@renderer/domain/shared-kernel';

type ContactWithId = { id: number } & Contact;

type ContactsForm = {
  contacts: number[];
};

type Props = {
  isOpen: boolean;
  signatories: Signatory[];
  onClose: () => void;
  onSelect: (signatories: Signatory[]) => void;
};

const SelectContactsModal = ({ signatories, isOpen, onClose, onSelect }: Props) => {
  const { t } = useI18n();
  const { matrix } = useMatrix();
  const { getLiveAccounts } = useAccount();
  const { getLiveContacts } = useContact();

  const accounts = getLiveAccounts();
  const contacts = getLiveContacts();

  const [query, setQuery] = useState('');
  const [contactList, setContactList] = useState<ContactWithId[]>([]);

  useEffect(() => {
    const accountIds = signatories.map((s) => s.accountId);

    const addressBookContacts = contacts.filter((c) => c.matrixId);
    const walletContacts = accounts
      .filter((a) => a.signingType !== SigningType.WATCH_ONLY)
      .map<Contact>((a) => ({
        name: a.name || a.accountId,
        address: toAddress(a.accountId),
        accountId: a.accountId,
        matrixId: matrix.userId,
      }));

    const mergedContacts = [...addressBookContacts, ...walletContacts].reduce<(Contact & { id: number })[]>(
      (acc, contact) => {
        if (!accountIds.includes(contact.accountId)) {
          acc.push({ ...contact, id: acc.length });
        }

        return acc;
      },
      [],
    );

    setContactList(mergedContacts);
  }, [accounts.length, contacts.length, signatories.length]);

  const searchedContactList = contactList.filter((c) => {
    return includes(c.address, query) || includes(c.matrixId, query) || includes(c.name, query);
  });

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isValid },
  } = useForm<ContactsForm>({
    mode: 'onChange',
    defaultValues: { contacts: [] },
  });

  const selectedContacts = watch('contacts');

  const resetAll = () => {
    reset();
    setQuery('');
  };

  const onSelectContacts: SubmitHandler<ContactsForm> = async ({ contacts }) => {
    const selectedContacts = contacts.map((c) => contactList[c]);

    onSelect(selectedContacts);
    onClose();
    resetAll();
  };

  const onSelectContact = (
    event: ChangeEvent<HTMLInputElement>,
    value: number[],
    onChange: (indexes: number[]) => void,
  ) => {
    const selectedContact = Number(event.target.value);

    if (event.target.checked) {
      onChange(value.concat(selectedContact));
    } else {
      onChange(value.filter((v) => v !== selectedContact));
    }
  };

  const isAccountSelected = (accountIdx: number): boolean => {
    return selectedContacts.some((index) => {
      const isCurrentIndex = accountIdx === index;
      const isSameContact = contactList[index].accountId === contactList[accountIdx].accountId;

      return !isCurrentIndex && isSameContact;
    });
  };

  return (
    <BaseModal contentClass="w-[486px]" isOpen={isOpen} onClose={onClose}>
      <form
        id="selectContactsForm"
        className="max-h-[300px] mx-2.5 my-4 overflow-y-auto"
        onSubmit={handleSubmit(onSelectContacts)}
      >
        <Input
          placeholder={t('createMultisigAccount.searchContactPlaceholder')}
          className="w-full h-8"
          value={query}
          onChange={setQuery}
        />
        <ul className="mt-4">
          {searchedContactList.map(({ id, accountId, name }) => (
            <li key={id} className="grid grid-flow-col gap-x-1 items-center rounded-2lg h-10 p-2.5 hover:bg-shade-5">
              <Controller
                name="contacts"
                control={control}
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <Checkbox
                    value={id}
                    disabled={isAccountSelected(id)}
                    onChange={(event) => onSelectContact(event, value, onChange)}
                  >
                    <Identicon className="row-span-2 self-center" address={accountId} background={false} />
                    <p className="text-neutral text-sm font-semibold">{name}</p>
                    {/* {contact.walletName && <p className="text-neutral-variant text-2xs">{stake.walletName}</p>} */}
                  </Checkbox>
                )}
              />
            </li>
          ))}
        </ul>
      </form>

      <div className="bg-shade-1 py-5">
        <Button
          type="submit"
          form="selectContactsForm"
          className="mx-auto"
          weight="lg"
          disabled={!isValid}
          pallet="primary"
          variant="fill"
        >
          {t('createMultisigAccount.addContactsButton')} {selectedContacts.length > 0 && `(${selectedContacts.length})`}
        </Button>
      </div>
    </BaseModal>
  );
};

export default SelectContactsModal;
