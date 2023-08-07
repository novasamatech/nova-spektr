import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';

import { Icon, Identicon, Button, Input, InputHint } from '@renderer/shared/ui';
import { useI18n, useMatrix } from '@renderer/app/providers';
import { Address, ErrorType } from '@renderer/domain/shared-kernel';
import { useContact, Contact } from '@renderer/entities/contact';
import { toAccountId, validateAddress } from '@renderer/shared/lib/utils';

type ContactFormData = {
  name: string;
  matrixId?: string;
  address: Address;
};

type Props = {
  contact?: Contact;
  onFormSubmit: () => void;
};

export const ContactForm = ({ contact, onFormSubmit }: Props) => {
  const { t } = useI18n();
  const { matrix } = useMatrix();
  const { addContact, updateContact, getContacts } = useContact();

  const [contacts, setContacts] = useState<Contact[]>([]);

  const isEdit = contact !== undefined;

  useEffect(() => {
    getContacts().then(setContacts);
  }, []);

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = useForm<ContactFormData>({
    mode: 'onChange',
    defaultValues: {
      name: contact?.name || '',
      matrixId: contact?.matrixId || '',
      address: contact?.address || '',
    },
  });

  const onSubmit: SubmitHandler<ContactFormData> = async (newContact) => {
    const updatedContact = {
      ...contact,
      ...newContact,
      accountId: toAccountId(newContact.address),
    };

    if (isEdit) {
      await updateContact(updatedContact);
    } else {
      await addContact(updatedContact);
    }

    onFormSubmit();
  };

  const validateMatrixLogin = (value?: string): boolean => {
    return !value || matrix.validateFullUserName(value);
  };

  const validateAddressExists = (value?: Address): boolean => {
    if (!value) return true;

    const accountId = toAccountId(value);
    const isSameAddress = value.toLowerCase() === contact?.address.toLowerCase();
    const isUnique = contacts.every((contact) => contact.accountId !== accountId);

    return isSameAddress || isUnique;
  };

  const validateNameExists = (value?: string): boolean => {
    if (!value) return true;

    const isSameName = value.toLowerCase() === contact?.name.toLowerCase();
    const isUnique = contacts.every((contact) => contact.name.toLowerCase() !== value.toLowerCase());

    return isSameName || isUnique;
  };

  return (
    <form className="flex flex-col pt-4 gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        rules={{ required: true, validate: validateNameExists }}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div className="flex flex-col gap-2">
            <Input
              className="w-full"
              wrapperClass="h-[42px]"
              label={t('addressBook.addContact.nameLabel')}
              placeholder={t('addressBook.addContact.namePlaceholder')}
              invalid={Boolean(error)}
              value={value}
              onChange={onChange}
            />
            <InputHint variant="error" active={error?.type === ErrorType.REQUIRED}>
              {t('addressBook.addContact.nameRequiredError')}
            </InputHint>
            <InputHint variant="error" active={error?.type === ErrorType.VALIDATE}>
              {t('addressBook.addContact.nameExistsError')}
            </InputHint>
          </div>
        )}
      />
      <Controller
        name="address"
        control={control}
        rules={{ required: true, validate: { validateAddress, validateAddressExists } }}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div className="flex flex-col gap-2">
            <Input
              prefixElement={
                value && !error ? <Identicon address={value} background={false} /> : <Icon name="emptyIdenticon" />
              }
              wrapperClass="h-[42px]"
              className="w-full ml-2"
              label={t('addressBook.addContact.accountIdLabel')}
              placeholder={t('addressBook.addContact.accountIdPlaceholder')}
              invalid={Boolean(error)}
              value={value}
              onChange={onChange}
            />
            <InputHint variant="hint" active={isEdit}>
              {t('addressBook.editContact.editWarning')}
            </InputHint>

            <InputHint variant="error" active={error?.type === ErrorType.REQUIRED}>
              {t('addressBook.addContact.accountIdRequiredError')}
            </InputHint>
            <InputHint variant="error" active={error?.type === 'validateAddress'}>
              {t('addressBook.addContact.accountIdIncorrectError')}
            </InputHint>
            <InputHint variant="error" active={error?.type === 'validateAddressExists'}>
              {t('addressBook.addContact.accountIdExistsError')}
            </InputHint>
          </div>
        )}
      />

      <Controller
        name="matrixId"
        control={control}
        rules={{ validate: validateMatrixLogin }}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div className="flex flex-col gap-2">
            <Input
              className="w-full"
              wrapperClass="h-[42px]"
              label={t('addressBook.addContact.matrixIdLabel')}
              placeholder={t('addressBook.addContact.matrixIdPlaceholder')}
              invalid={Boolean(error)}
              value={value}
              onChange={onChange}
            />
            <InputHint active={!error}>{t('addressBook.addContact.matrixIdHint')}</InputHint>
            <InputHint variant="error" active={Boolean(error)}>
              {t('addressBook.addContact.matrixIdError')}
            </InputHint>
          </div>
        )}
      />

      <Button className="ml-auto" type="submit" disabled={!isValid || isSubmitting} isLoading={isSubmitting}>
        {t(isEdit ? 'addressBook.editContact.saveContactButton' : 'addressBook.addContact.addContactButton')}
      </Button>
    </form>
  );
};
