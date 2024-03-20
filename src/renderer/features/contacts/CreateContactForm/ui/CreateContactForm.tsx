import { useUnit } from 'effector-react';
import { FormEvent, useEffect } from 'react';
import { useForm } from 'effector-forms';

import { createFormModel, Callbacks } from '../model/contact-form';
import { Button, Icon, Identicon, Input, InputHint } from '@shared/ui';
import { useI18n } from '@app/providers';

type Props = Callbacks;
export const CreateContactForm = ({ onSubmit }: Props) => {
  const { t } = useI18n();

  const {
    submit,
    isValid,
    fields: { name, address, matrixId },
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

  const canShowIdenticon = address?.value && !address?.hasError();

  return (
    <form className="flex flex-col pt-4 gap-4" onSubmit={submitForm}>
      <div className="flex flex-col gap-2">
        <Input
          name="name"
          className="w-full"
          wrapperClass="h-[42px]"
          label={t('addressBook.createContact.nameLabel')}
          placeholder={t('addressBook.createContact.namePlaceholder')}
          invalid={name?.hasError()}
          value={name?.value}
          onChange={name?.onChange}
        />
        <InputHint variant="error" active={name?.hasError()}>
          {t(name.errorText())}
        </InputHint>
      </div>

      <div className="flex flex-col gap-2">
        <Input
          name="address"
          wrapperClass="h-[42px]"
          className="w-full ml-2"
          label={t('addressBook.createContact.accountIdLabel')}
          placeholder={t('addressBook.createContact.accountIdPlaceholder')}
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
        <InputHint variant="error" active={address?.hasError()}>
          {t(address?.errorText())}
        </InputHint>
      </div>

      <div className="flex flex-col gap-2">
        <Input
          name="matrixId"
          className="w-full"
          wrapperClass="h-[42px]"
          label={t('addressBook.createContact.matrixIdLabel')}
          placeholder={t('addressBook.createContact.matrixIdPlaceholder')}
          invalid={matrixId?.hasError()}
          value={matrixId?.value}
          onChange={matrixId?.onChange}
        />
        <InputHint active={!matrixId?.hasError()}>{t('addressBook.createContact.matrixIdHint')}</InputHint>
        <InputHint variant="error" active={matrixId?.hasError()}>
          {t(matrixId?.errorText())}
        </InputHint>
      </div>

      <Button className="ml-auto" type="submit" disabled={!isValid || pending} isLoading={pending}>
        {t('addressBook.createContact.addContactButton')}
      </Button>
    </form>
  );
};
