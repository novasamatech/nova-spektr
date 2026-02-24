import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect } from 'react';

import { type Address, type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, InputHint } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { Box, Field, Input, Modal } from '@/shared/ui-kit';
import { editFormModel } from '../model/contact-form';

type Props = {
  contactToEdit: Contact;
};
export const EditContactForm = ({ contactToEdit }: Props) => {
  const { t } = useI18n();

  const {
    submit,
    isValid,
    fields: { name, address },
  } = useForm(editFormModel.$contactForm);

  const pending = useUnit(editFormModel.$submitPending);

  useEffect(() => {
    editFormModel.events.formInitiated(contactToEdit);
  }, [contactToEdit]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <form onSubmit={submitForm}>
      <Box gap={4} padding={[4, 5]}>
        <Field text={t('addressBook.editContact.nameLabel')}>
          <Input
            name="name"
            placeholder={t('addressBook.editContact.namePlaceholder')}
            invalid={name?.hasError()}
            value={name?.value}
            onChange={name?.onChange}
          />
          <InputHint variant="error" active={name?.hasError()}>
            {t(name.errorText())}
          </InputHint>
        </Field>

        <Field text={t('addressBook.editContact.accountIdLabel')}>
          <Input
            name="address"
            placeholder={t('addressBook.editContact.accountIdPlaceholder')}
            invalid={address.hasError()}
            value={address.value}
            prefixElement={<Identicon address={address.value as Address} background={false} />}
            onChange={address.onChange}
          />
          <InputHint variant="hint" active>
            {t('addressBook.editContact.editWarning')}
          </InputHint>
          <InputHint variant="error" active={address?.hasError()}>
            {t(address.errorText())}
          </InputHint>
        </Field>
      </Box>

      <Modal.Footer>
        <Button className="ml-auto" type="submit" disabled={!isValid || pending} isLoading={pending}>
          {t('addressBook.editContact.saveContactButton')}
        </Button>
      </Modal.Footer>
    </form>
  );
};
