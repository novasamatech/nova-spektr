import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useEffect } from 'react';

import { Icon, Identicon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Address, ErrorType } from '@renderer/domain/shared-kernel';
import { useContact } from '@renderer/services/contact/contactService';
import { toAccountId, validateAddress } from '@renderer/shared/utils/address';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Contact } from '@renderer/domain/contact';
import { BaseModal, Button, Input, InputHint } from '@renderer/components/ui-redesign';

type ContactForm = {
  name: string;
  matrixId?: string;
  address: Address;
};

type Props = {
  isOpen: boolean;
  onToggle: () => void;
  contact?: Contact;
};

const initialFormValues = { name: '', matrixId: '', address: '' };

const ContactModal = ({ isOpen, onToggle, contact }: Props) => {
  const { t } = useI18n();
  const { matrix } = useMatrix();
  const { addContact, updateContact, getLiveContacts } = useContact();

  const contacts = getLiveContacts();

  const isEdit = contact !== undefined;

  const {
    control,
    handleSubmit,
    formState: { isValid },
    reset,
  } = useForm<ContactForm>({
    mode: 'onChange',
    defaultValues: initialFormValues,
  });

  useEffect(() => {
    reset({
      name: isEdit ? contact.name : '',
      matrixId: isEdit ? contact.matrixId : '',
      address: isEdit ? contact.address : '',
    });
  }, [contact]);

  const onSubmit: SubmitHandler<ContactForm> = async (newContact) => {
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

    handleClose();
  };

  const handleClose = () => {
    reset(initialFormValues);
    onToggle();
  };

  const validateMatrixLogin = (value?: string): boolean => {
    return !value || matrix.validateFullUserName(value);
  };

  const validateAddressExists = (value?: string): boolean => {
    return (
      (isEdit && value?.toLowerCase() === contact.address.toLowerCase()) ||
      (!!value && contacts.every((contact) => contact.accountId !== toAccountId(value)))
    );
  };

  const validateNameExists = (value?: string): boolean => {
    return (
      (isEdit && value?.toLowerCase() === contact.name.toLowerCase()) ||
      contacts.every((contact) => contact.name.toLowerCase() !== value?.toLowerCase())
    );
  };

  return (
    <BaseModal
      title={t(isEdit ? 'addressBook.editContact.title' : 'addressBook.addContact.title')}
      closeButton
      isOpen={isOpen}
      headerClass="py-[15px] px-5"
      contentClass="px-5 pb-4 w-[440px]"
      onClose={handleClose}
    >
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

        <InputHint variant="hint" active={true}>
          {t('addressBook.editContact.editWarning')}
        </InputHint>

        <Button className="ml-auto" type="submit" disabled={!isValid}>
          {t(isEdit ? 'addressBook.editContact.saveContactButton' : 'addressBook.editContact.addContactButton')}
        </Button>
      </form>
    </BaseModal>
  );
};

export default ContactModal;
