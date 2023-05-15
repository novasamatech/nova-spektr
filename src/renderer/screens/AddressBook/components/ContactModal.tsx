import { Controller, FieldErrors, SubmitHandler, useForm } from 'react-hook-form';
import { useEffect } from 'react';

import { BaseModal, Button, Icon, Identicon, Input, InputHint } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Address, ErrorType } from '@renderer/domain/shared-kernel';
import { useContact } from '@renderer/services/contact/contactService';
import { pasteAddressHandler, toAccountId, validateAddress } from '@renderer/shared/utils/address';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Contact } from '@renderer/domain/contact';

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

const getButtonText = (errors: FieldErrors<ContactForm>, isEdit: boolean): string => {
  if (errors.address && errors.name) {
    return 'addressBook.addContact.typeAddressAndNameButton';
  }

  if (errors.address) {
    return 'addressBook.addContact.typeAddressButton';
  }

  if (errors.name) {
    return 'addressBook.addContact.typeNameButton';
  }

  if (isEdit) {
    return 'addressBook.editContact.saveContactButton';
  }

  return 'addressBook.addContact.addContactButton';
};

const initialFormValues = { name: '', matrixId: '', address: '' };

const ContactModal = ({ isOpen, onToggle, contact }: Props) => {
  const { t } = useI18n();
  const { matrix } = useMatrix();
  const { addContact, updateContact } = useContact();

  const isEdit = contact !== undefined;

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
    reset,
    resetField,
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

  return (
    <BaseModal
      title={t(isEdit ? 'addressBook.editContact.title' : 'addressBook.addContact.title')}
      closeButton
      isOpen={isOpen}
      contentClass="px-5 pb-4 w-[520px]"
      onClose={handleClose}
    >
      <form className="flex flex-col mt-14 mb-3 gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <>
              <Input
                className="w-full"
                label={t('addressBook.addContact.nameLabel')}
                placeholder={t('addressBook.addContact.namePlaceholder')}
                invalid={Boolean(error)}
                value={value}
                onChange={onChange}
              />
              <InputHint variant="error" active={Boolean(error)}>
                {t('addressBook.addContact.nameRequiredError')}
              </InputHint>
            </>
          )}
        />
        <Controller
          name="matrixId"
          control={control}
          rules={{ validate: validateMatrixLogin }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <>
              <Input
                suffixElement={
                  value && (
                    <button
                      className="text-neutral"
                      type="button"
                      onClick={() => resetField('matrixId', { defaultValue: '' })}
                    >
                      <Icon name="clearOutline" />
                    </button>
                  )
                }
                className="w-full"
                label={t('addressBook.addContact.matrixIdLabel')}
                placeholder={t('addressBook.addContact.matrixIdPlaceholder')}
                invalid={Boolean(error)}
                value={value}
                onChange={onChange}
              />
              <InputHint variant="error" active={Boolean(error)}>
                {t('addressBook.addContact.matrixIdError')}
              </InputHint>
            </>
          )}
        />
        <Controller
          name="address"
          control={control}
          rules={{ required: true, validate: validateAddress }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <>
              <Input
                prefixElement={
                  value && !error ? <Identicon address={value} background={false} /> : <Icon name="emptyIdenticon" />
                }
                suffixElement={
                  value ? (
                    <button
                      className="text-neutral"
                      type="button"
                      onClick={() => resetField('address', { defaultValue: '' })}
                    >
                      <Icon name="clearOutline" />
                    </button>
                  ) : (
                    <Button variant="outline" pallet="primary" onClick={pasteAddressHandler(onChange)}>
                      {t('general.button.pasteButton')}
                    </Button>
                  )
                }
                className="w-full"
                label={t('addressBook.addContact.accountIdLabel')}
                placeholder={t('addressBook.addContact.accountIdPlaceholder')}
                invalid={Boolean(error)}
                value={value}
                onChange={onChange}
              />
              <InputHint variant="error" active={error?.type === ErrorType.REQUIRED}>
                {t('addressBook.addContact.accountIdRequiredError')}
              </InputHint>
              <InputHint variant="error" active={error?.type === ErrorType.VALIDATE}>
                {t('addressBook.addContact.accountIdIncorrectError')}
              </InputHint>
            </>
          )}
        />

        <InputHint variant="hint" active={true}>
          {t('addressBook.editContact.editWarning')}
        </InputHint>

        <Button
          weight="lg"
          className="w-fit self-center"
          pallet="primary"
          variant="fill"
          type="submit"
          disabled={!isValid}
        >
          {t(getButtonText(errors, isEdit))}
        </Button>
      </form>
    </BaseModal>
  );
};

export default ContactModal;
