import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect } from 'react';

import { useI18n } from '@app/providers';
import { type Contact } from '@shared/core';
import { Button, Icon, Identicon, Input, InputHint } from '@shared/ui';
import { type Callbacks, editFormModel } from '../model/contact-form';

type Props = Callbacks & {
  contactToEdit: Contact;
};
export const EditContactForm = ({ contactToEdit, onSubmit }: Props) => {
  const { t } = useI18n();

  const {
    submit,
    isValid,
    fields: { name, address, matrixId },
  } = useForm(editFormModel.$contactForm);

  const pending = useUnit(editFormModel.$submitPending);

  useEffect(() => {
    editFormModel.events.formInitiated(contactToEdit);
  }, [contactToEdit]);

  useEffect(() => {
    editFormModel.events.callbacksChanged({ onSubmit });
  }, [onSubmit]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const canShowIdenticon = address?.value && !address?.hasError();

  return (
    <form className="flex flex-col pt-4 gap-4" onSubmit={submitForm}>
      <div className="flex flex-col gap-y-2">
        <Input
          name="name"
          className="w-full"
          wrapperClass="h-[42px]"
          label={t('addressBook.editContact.nameLabel')}
          placeholder={t('addressBook.editContact.namePlaceholder')}
          invalid={name?.hasError()}
          value={name?.value}
          onChange={name?.onChange}
        />
        <InputHint variant="error" active={name?.hasError()}>
          {t(name.errorText())}
        </InputHint>
      </div>

      <div className="flex flex-col gap-y-2">
        <Input
          name="address"
          wrapperClass="h-[42px]"
          className="w-full ml-2"
          label={t('addressBook.editContact.accountIdLabel')}
          placeholder={t('addressBook.editContact.accountIdPlaceholder')}
          invalid={address?.hasError()}
          value={address?.value}
          prefixElement={
            canShowIdenticon ? (
              <Identicon address={address?.value} background={false} />
            ) : (
              <Icon name="emptyIdenticon" />
            )
          }
          onChange={address?.onChange}
        />
        <InputHint variant="hint" active>
          {t('addressBook.editContact.editWarning')}
        </InputHint>
        <InputHint variant="error" active={address?.hasError()}>
          {t(address.errorText())}
        </InputHint>
      </div>

      <div className="flex flex-col gap-y-2">
        <Input
          name="matrixId"
          className="w-full"
          wrapperClass="h-[42px]"
          label={t('addressBook.editContact.matrixIdLabel')}
          placeholder={t('addressBook.editContact.matrixIdPlaceholder')}
          invalid={matrixId?.hasError()}
          value={matrixId?.value}
          onChange={matrixId?.onChange}
        />
        <InputHint active={!matrixId?.hasError()}>{t('addressBook.editContact.matrixIdHint')}</InputHint>
        <InputHint variant="error" active={matrixId?.hasError()}>
          {t(matrixId?.errorText())}
        </InputHint>
      </div>

      <Button className="ml-auto" type="submit" disabled={!isValid || pending} isLoading={pending}>
        {t('addressBook.editContact.saveContactButton')}
      </Button>
    </form>
  );
};
