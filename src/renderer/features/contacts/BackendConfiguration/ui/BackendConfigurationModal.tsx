import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, InputHint } from '@/shared/ui';
import { Box, Field, Input, Modal } from '@/shared/ui-kit';
import { backendConfigurationModel } from '../model/backend-configuration-model';

export const BackendConfigurationModal = () => {
  const { t } = useI18n();

  const [isOpen, draftUrl, isValid, hasBackend] = useUnit([
    backendConfigurationModel.$isModalOpen,
    backendConfigurationModel.$draftUrl,
    backendConfigurationModel.$isUrlValid,
    backendConfigurationModel.$hasBackend,
  ]);

  const title = hasBackend
    ? t('addressBook.backendConfiguration.editTitle')
    : t('addressBook.backendConfiguration.addTitle');

  const showError = draftUrl.trim().length > 0 && !isValid;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) {
      backendConfigurationModel.events.urlSaved();
    }
  };

  return (
    <Modal isOpen={isOpen} size="sm" onToggle={(open) => !open && backendConfigurationModel.events.modalClosed()}>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
        <form id="backend-configuration-form" onSubmit={handleSubmit}>
          <Box padding={[4, 5]} gap={4}>
            <Field text={t('addressBook.backendConfiguration.urlLabel')}>
              <Input
                name="backendUrl"
                placeholder={t('addressBook.backendConfiguration.urlPlaceholder')}
                invalid={showError}
                value={draftUrl}
                onChange={backendConfigurationModel.events.urlChanged}
              />
              <InputHint variant="error" active={showError}>
                {t('addressBook.backendConfiguration.urlInvalidError')}
              </InputHint>
            </Field>
          </Box>
        </form>
      </Modal.Content>
      <Modal.Footer>
        <Button className="ml-auto" type="submit" form="backend-configuration-form" disabled={!isValid}>
          {t('addressBook.backendConfiguration.saveButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
