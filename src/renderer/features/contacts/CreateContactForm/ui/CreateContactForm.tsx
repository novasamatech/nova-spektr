import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, Icon, Identicon, InputHint } from '@/shared/ui';
import { Field, Input } from '@/shared/ui-kit';
import { type Callbacks, createFormModel } from '../model/contact-form';

type Props = Callbacks;
export const CreateContactForm = ({ onSubmit }: Props) => {
  const { t } = useI18n();

  const {
    submit,
    isValid,
    fields: { name, address },
  } = useForm(createFormModel.$contactForm);

  const pending = useUnit(createFormModel.$submitPending);

  useEffect(() => {
    createFormModel.events.formInitiated();
  }, []);

  useEffect(() => {
    createFormModel.events.callbacksChanged({ onSubmit });
  }, [onSubmit]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const canShowIdenticon = address.value && !address.hasError();

  return (
    <form className="flex flex-col gap-4 pt-4" onSubmit={submitForm}>
      <Field text={t('addressBook.createContact.nameLabel')}>
        <Input
          name="name"
          placeholder={t('addressBook.createContact.namePlaceholder')}
          invalid={name.hasError()}
          value={name.value}
          onChange={name.onChange}
        />
        <InputHint variant="error" active={name.hasError()}>
          {t(name.errorText())}
        </InputHint>
      </Field>

      <Field text={t('addressBook.createContact.accountIdLabel')}>
        <Input
          name="address"
          placeholder={t('addressBook.createContact.accountIdPlaceholder')}
          invalid={address.hasError()}
          value={address.value}
          prefixElement={
            canShowIdenticon ? <Identicon address={address.value} background={false} /> : <Icon name="emptyIdenticon" />
          }
          onChange={address.onChange}
        />
        <InputHint variant="error" active={address.hasError()}>
          {t(address.errorText())}
        </InputHint>
      </Field>

      <Button className="ml-auto" type="submit" disabled={!isValid || pending} isLoading={pending}>
        {t('addressBook.createContact.addContactButton')}
      </Button>
    </form>
  );
};
