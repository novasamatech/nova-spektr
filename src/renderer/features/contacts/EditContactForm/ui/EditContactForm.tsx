import { useStore } from 'effector-react';
import { FormEvent, useEffect } from 'react';
import { useForm } from 'effector-forms';

import * as editFormModel from '../model/contact-form';
import { Button, Icon, Identicon, Input, InputHint } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

export const EditContactForm = (props: editFormModel.FormApi) => {
  const { t } = useI18n();

  const {
    fields: { name, address, matrixId },
    eachValid,
    submit,
  } = useForm(editFormModel.contactForm);

  const pending = useStore(editFormModel.$submitPending);

  useEffect(() => {
    editFormModel.events.formPropsChanged(props);
  }, [props]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const canShowIdenticon = address?.value && !address?.hasError();

  return (
    <form className="flex flex-col pt-4 gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
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
          {t(name?.errorText())}
        </InputHint>
      </div>

      <div className="flex flex-col gap-2">
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
          {t(address?.errorText())}
        </InputHint>
      </div>

      <div className="flex flex-col gap-2">
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

      <Button className="ml-auto" type="submit" disabled={!eachValid || pending} isLoading={pending}>
        {t('addressBook.editContact.saveContactButton')}
      </Button>
    </form>
  );
};
