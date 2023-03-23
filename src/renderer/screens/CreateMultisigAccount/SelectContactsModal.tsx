import { ChangeEvent, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { BaseModal, Button, Checkbox, Identicon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Signatory } from '@renderer/domain/signatory';
import { useAccount } from '@renderer/services/account/accountService';
import { useContact } from '@renderer/services/contact/contactService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { includes } from '@renderer/shared/utils/strings';
import { SigningType } from '@renderer/domain/shared-kernel';

type ContactsForm = {
  contacts: number[];
};

type Props = {
  isOpen: boolean;
  signatories: Signatory[];
  onClose: () => void;
  onSelect: (signatories: Signatory[]) => void;
};

type SignatoryWithId = Signatory & {
  id: number;
};

const SelectContactsModal = ({ signatories, isOpen, onClose, onSelect }: Props) => {
  const { t } = useI18n();
  const { matrix } = useMatrix();
  const { getLiveAccounts } = useAccount();
  const { getLiveContacts } = useContact();
  const accounts = getLiveAccounts();
  const contacts = getLiveContacts();

  const [query, setQuery] = useState('');
  const [contactList, setContactList] = useState<SignatoryWithId[]>([]);

  useEffect(() => {
    const publicKeys = signatories.map((s) => s.publicKey);

    const addressBookContacts = contacts.filter((c) => c.matrixId);
    const walletContacts = accounts
      .filter((a) => a.signingType !== SigningType.WATCH_ONLY)
      .map((a) => ({
        accountId: a.accountId || '',
        name: a.name || a.accountId || '',
        publicKey: a.publicKey || '0x',
        matrixId: matrix.userId,
      }));

    const mergedContacts = [...addressBookContacts, ...walletContacts].reduce<SignatoryWithId[]>(
      (acc, contact, index) => {
        if (!publicKeys.includes(contact.publicKey)) {
          acc.push({ ...contact, id: index });
        }

        return acc;
      },
      [],
    );

    setContactList(mergedContacts);
  }, [accounts.length, contacts.length, signatories.length]);

  const searchedContactList = contactList.filter(
    (c) => includes(c.accountId, query) || includes(c.matrixId, query) || includes(c.name, query),
  );

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isValid },
  } = useForm<ContactsForm>({
    mode: 'onChange',
    defaultValues: {
      contacts: [],
    },
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
    onChange: (value: number[]) => void,
    value: number[],
  ) => {
    const selectedContact = Number(event.target.value);

    if (event.target.checked) {
      onChange([...value, selectedContact]);
    } else {
      onChange(value.filter((v) => v !== selectedContact));
    }
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
          {searchedContactList.map(({ accountId, name, id }) => (
            <li key={id} className="grid grid-flow-col gap-x-1 items-center rounded-2lg h-10 p-2.5 hover:bg-shade-5">
              <Controller
                name="contacts"
                control={control}
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <Checkbox value={id} onChange={(event) => onSelectContact(event, onChange, value)}>
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
